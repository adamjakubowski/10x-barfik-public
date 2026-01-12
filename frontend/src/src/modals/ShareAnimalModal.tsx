import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useCreateCollaboration } from '@/hooks/useCollaborations';
import type { AnimalDetail } from '@/api/types';
import axios from 'axios';

type ShareAnimalModalProps = {
  animal: AnimalDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShareAnimalModal({ animal, open, onOpenChange }: ShareAnimalModalProps) {
  const [email, setEmail] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const userSearch = useUserSearch();
  const createCollaboration = useCreateCollaboration();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setSearchError('Email jest wymagany');
      return;
    }

    try {
      // Search for user
      const userResponse = await userSearch.mutateAsync(email.trim());

      // Extract user data - API might return { data: User } or User directly
      const user = (userResponse as any)?.data || userResponse;

      if (!user || !user.id) {
        setSearchError('Nie udało się znaleźć użytkownika');
        return;
      }

      // Create collaboration with EDIT permission (default)
      await createCollaboration.mutateAsync({
        animalId: animal.id,
        data: { user: user.id },
      });

      setSuccessMessage(`Zwierzę zostało udostępnione użytkownikowi ${user.email}`);
      setEmail('');

      // Close modal after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        setSuccessMessage(null);
      }, 2000);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          setSearchError('Użytkownik nie istnieje');
        } else if (error.response?.data?.user) {
          // Backend validation error (e.g., duplicate, self-sharing)
          const errorMessage = Array.isArray(error.response.data.user)
            ? error.response.data.user[0]
            : error.response.data.user;
          setSearchError(errorMessage || 'Błąd podczas udostępniania');
        } else if (error.response?.data) {
          // Try to extract any error message from response
          const data = error.response.data;
          const firstError = data.non_field_errors?.[0] ||
                           data.detail ||
                           Object.values(data)[0];
          setSearchError(typeof firstError === 'string' ? firstError : 'Błąd podczas udostępniania zwierzęcia');
        } else {
          setSearchError('Wystąpił błąd podczas udostępniania zwierzęcia');
        }
      } else {
        setSearchError('Wystąpił błąd podczas udostępniania zwierzęcia');
      }
    }
  };

  const handleClose = () => {
    setEmail('');
    setSearchError(null);
    setSuccessMessage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <p className="text-sm text-muted-foreground">Udostępnij zwierzę</p>
          <DialogTitle>{animal.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email użytkownika</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="np. jan@example.com"
              autoFocus
              disabled={userSearch.isPending || createCollaboration.isPending}
            />
            <p className="text-sm text-muted-foreground">
              Użytkownik otrzyma uprawnienia do edycji tego zwierzęcia.
            </p>
          </div>

          {searchError && (
            <Alert variant="destructive">
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border-green-200 bg-green-50 text-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={userSearch.isPending || createCollaboration.isPending}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={userSearch.isPending || createCollaboration.isPending}
            >
              {userSearch.isPending || createCollaboration.isPending ? 'Udostępnianie...' : 'Udostępnij'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
