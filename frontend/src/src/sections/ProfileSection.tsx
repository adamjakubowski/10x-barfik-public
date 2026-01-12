import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { userApi } from '../api/services'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHeader } from '@/components/ui/section-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export function ProfileSection() {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setEmail(user.email || '')
    }
  }, [user])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      await userApi.updateMe({
        first_name: firstName,
        last_name: lastName,
      })
      setSaveMessage({ type: 'success', text: 'Dane zostały zapisane pomyślnie' })
    } catch {
      setSaveMessage({ type: 'error', text: 'Wystąpił błąd podczas zapisywania' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section id="profil" className="space-y-6">
      <SectionHeader
        eyebrow="Profil"
        title="Dane użytkownika"
        actions={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Imię</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Jan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nazwisko</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Kowalski"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jan@example.com"
                value={email}
                disabled
                readOnly
              />
            </div>
          </div>

          {saveMessage && (
            <Alert className={`mt-6 ${saveMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              {saveMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {saveMessage.text}
              </AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-muted-foreground mt-6">
            Zmiana hasła i reset e-mail zostaną dodane po MVP.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
