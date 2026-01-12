import { useState, useEffect } from 'react';
import { useAnimals } from '@/hooks/useAnimals';
import { useDeleteCollaboration } from '@/hooks/useCollaborations';
import { collaborationsApi } from '@/api/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Share2 } from 'lucide-react';
import type { Collaboration } from '@/api/types';

type DeleteConfirmation = {
  animalId: number;
  collaborationId: number;
  animalName: string;
  userEmail: string;
} | null;

export function CollaborationsSection() {
  const { data: animalsData } = useAnimals();
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>(null);
  const [collaborationsByAnimal, setCollaborationsByAnimal] = useState<Map<number, { animalName: string; collaborations: Collaboration[] }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const deleteCollaboration = useDeleteCollaboration();

  const animals = animalsData?.results || [];

  // Fetch collaborations for all animals
  useEffect(() => {
    const fetchCollaborations = async () => {
      if (animals.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const grouped = new Map<number, { animalName: string; collaborations: Collaboration[] }>();

      try {
        const results = await Promise.all(
          animals.map(async (animal) => {
            try {
              const response = await collaborationsApi.list(animal.id);
              return { animal, collaborations: response.data.results || [] };
            } catch {
              return { animal, collaborations: [] };
            }
          })
        );

        results.forEach(({ animal, collaborations }) => {
          if (collaborations.length > 0) {
            grouped.set(animal.id, {
              animalName: animal.name,
              collaborations,
            });
          }
        });
        setCollaborationsByAnimal(grouped);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollaborations();
  }, [animals]);

  const handleRemove = async (animalId: number, collaborationId: number) => {
    if (deleteConfirmation) {
      try {
        await deleteCollaboration.mutateAsync({ animalId, collaborationId });
        setDeleteConfirmation(null);

        // Refetch collaborations after deletion
        const response = await collaborationsApi.list(animalId);
        const updatedCollaborations = response.data.results || [];

        if (updatedCollaborations.length === 0) {
          setCollaborationsByAnimal(prev => {
            const newMap = new Map(prev);
            newMap.delete(animalId);
            return newMap;
          });
        } else {
          setCollaborationsByAnimal(prev => {
            const newMap = new Map(prev);
            const entry = prev.get(animalId);
            if (entry) {
              newMap.set(animalId, {
                ...entry,
                collaborations: updatedCollaborations,
              });
            }
            return newMap;
          });
        }
      } catch {
        // Error handled by mutation
      }
    }
  };

  const handleDeleteClick = (animalId: number, collaborationId: number, animalName: string, userEmail: string) => {
    setDeleteConfirmation({
      animalId,
      collaborationId,
      animalName,
      userEmail,
    });
  };

  const isEmpty = collaborationsByAnimal.size === 0;

  if (isLoading) {
    return (
      <section id="udostepnione" className="space-y-6">
        <SectionHeader eyebrow="Współdzielenie" title="Udostępnione zwierzęta" />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </section>
    );
  }

  if (isEmpty) {
    return (
      <section id="udostepnione" className="space-y-6">
        <SectionHeader eyebrow="Współdzielenie" title="Udostępnione zwierzęta" />
        <EmptyState
          icon={<Share2 className="h-16 w-16" />}
          description="Nie udostępniłeś jeszcze żadnych zwierząt innym użytkownikom."
        />
      </section>
    );
  }

  return (
    <section id="udostepnione" className="space-y-6">
      <SectionHeader eyebrow="Współdzielenie" title="Udostępnione zwierzęta" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from(collaborationsByAnimal.entries()).map(([animalId, { animalName, collaborations }]) => (
          <Card key={animalId}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{animalName}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {collaborations.length} {collaborations.length === 1 ? 'współopiekun' : 'współopiekunów'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {collaborations.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{collab.user_email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={collab.permission === 'EDIT' ? 'default' : 'secondary'} className="text-xs">
                          {collab.permission === 'EDIT' ? 'Edycja' : 'Odczyt'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(collab.created_at).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(animalId, collab.id, animalName, collab.user_email)}
                      disabled={deleteCollaboration.isPending}
                      className="ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Usuń
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Czy na pewno chcesz usunąć udostępnienie?</DialogTitle>
            <DialogDescription>
              <strong>{deleteConfirmation?.animalName}</strong>
              <br />
              Użytkownik: {deleteConfirmation?.userEmail}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Użytkownik straci dostęp do tego zwierzęcia i jego diet.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmation(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmation) {
                  handleRemove(deleteConfirmation.animalId, deleteConfirmation.collaborationId);
                }
              }}
              disabled={deleteCollaboration.isPending}
            >
              {deleteCollaboration.isPending ? 'Usuwanie...' : 'Usuń udostępnienie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
