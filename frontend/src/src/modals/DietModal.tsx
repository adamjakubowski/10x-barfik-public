import { useState } from 'react'
import type { DietDetail, Ingredient, IngredientCategory, Unit } from '../api/types'
import { useCreateIngredient, useUpdateIngredient, useDeleteIngredient } from '../hooks/useIngredients'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useErrorHandler } from '../lib/errorHandler'
import { getErrorMessage } from '../lib/apiErrors'

type DietModalProps = {
  diet: DietDetail
  ingredientCategories: IngredientCategory[]
  units: Unit[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    start_date: string
    end_date?: string | null
    description?: string
  }) => Promise<void>
}

type IngredientFormData = {
  name: string
  category_id: number | null
  cooking_method: 'raw' | 'cooked'
  unit_id: number
  amount: string
}

export function DietModal({ diet, ingredientCategories, units, open, onOpenChange, onSave }: DietModalProps) {
  const { showError } = useErrorHandler()
  const [isEditing, setIsEditing] = useState(false)
  const [startDate, setStartDate] = useState(diet.start_date)
  const [endDate, setEndDate] = useState(diet.end_date || '')
  const [description, setDescription] = useState(diet.description || '')
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  // Stan dla składników
  const [isAddingIngredient, setIsAddingIngredient] = useState(false)
  const [editingIngredientId, setEditingIngredientId] = useState<number | null>(null)
  const [deletingIngredientId, setDeletingIngredientId] = useState<number | null>(null)
  const [ingredientForm, setIngredientForm] = useState<IngredientFormData>({
    name: '',
    category_id: null,
    cooking_method: 'raw',
    unit_id: units[0]?.id || 1,
    amount: '',
  })

  const createIngredient = useCreateIngredient(diet.id)
  const updateIngredient = useUpdateIngredient(diet.id)
  const deleteIngredient = useDeleteIngredient(diet.id)

  const handleSave = async () => {
    setIsSaving(true)
    setValidationErrors({})
    try {
      await onSave({
        start_date: startDate,
        end_date: endDate || null,
        description: description || '',
      })
      setIsEditing(false)
    } catch (error: unknown) {
      // Sprawdź czy to błąd walidacji
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } }
        if (axiosError.response?.status === 400 && axiosError.response?.data) {
          const data = axiosError.response.data
          if (typeof data === 'object' && data !== null) {
            setValidationErrors(data as Record<string, string>)
          } else {
            showError('Wystąpił błąd podczas zapisywania diety', 'Błąd')
          }
        } else {
          showError(getErrorMessage(error), 'Nie udało się zapisać diety')
        }
      } else {
        showError(getErrorMessage(error), 'Nie udało się zapisać diety')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setStartDate(diet.start_date)
    setEndDate(diet.end_date || '')
    setDescription(diet.description || '')
    setIsEditing(false)
  }

  const resetIngredientForm = () => {
    setIngredientForm({
      name: '',
      category_id: null,
      cooking_method: 'raw',
      unit_id: units[0]?.id || 1,
      amount: '',
    })
  }

  const handleAddIngredient = () => {
    resetIngredientForm()
    setIsAddingIngredient(true)
  }

  const handleCancelAddIngredient = () => {
    setIsAddingIngredient(false)
    resetIngredientForm()
  }

  const handleSaveNewIngredient = async () => {
    if (!ingredientForm.name || !ingredientForm.amount) return

    try {
      await createIngredient.mutateAsync({
        name: ingredientForm.name,
        category_id: ingredientForm.category_id,
        cooking_method: ingredientForm.cooking_method,
        unit_id: ingredientForm.unit_id,
        amount: ingredientForm.amount,
      })
      setIsAddingIngredient(false)
      resetIngredientForm()
    } catch (error) {
      showError(getErrorMessage(error), 'Nie udało się dodać składnika')
    }
  }

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredientId(ingredient.id)
    setIngredientForm({
      name: ingredient.name,
      category_id: ingredient.category?.id || null,
      cooking_method: ingredient.cooking_method,
      unit_id: ingredient.unit.id,
      amount: ingredient.amount.toString(),
    })
  }

  const handleCancelEditIngredient = () => {
    setEditingIngredientId(null)
    resetIngredientForm()
  }

  const handleSaveEditIngredient = async () => {
    if (!ingredientForm.name || !ingredientForm.amount || !editingIngredientId) return

    try {
      await updateIngredient.mutateAsync({
        ingredientId: editingIngredientId,
        data: {
          name: ingredientForm.name,
          category_id: ingredientForm.category_id,
          cooking_method: ingredientForm.cooking_method,
          unit_id: ingredientForm.unit_id,
          amount: ingredientForm.amount,
        }
      })
      setEditingIngredientId(null)
      resetIngredientForm()
    } catch (error) {
      showError(getErrorMessage(error), 'Nie udało się zaktualizować składnika')
    }
  }

  const handleDeleteIngredient = async () => {
    if (!deletingIngredientId) return

    try {
      await deleteIngredient.mutateAsync(deletingIngredientId)
      setDeletingIngredientId(null)
    } catch (error) {
      showError(getErrorMessage(error), 'Nie udało się usunąć składnika')
    }
  }

  const deletingIngredient = diet.ingredients?.find(i => i.id === deletingIngredientId)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="diet-modal">
          <DialogHeader>
            <p className="text-sm text-muted-foreground mb-1">Dieta</p>
            <DialogTitle>{`${diet.animal_name} • ${diet.start_date} — ${diet.end_date || 'otwarta'}`}</DialogTitle>
          </DialogHeader>

          <div className="flex justify-end gap-2 -mt-2">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
                  Anuluj
                </Button>
                <Button variant="default" onClick={handleSave} disabled={isSaving} data-testid="diet-submit-button">
                  {isSaving ? 'Zapisywanie...' : 'Zapisz'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="default" onClick={() => setIsEditing(true)}>Edytuj</Button>
              </>
            )}
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data startu</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (validationErrors.start_date) {
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { start_date, ...rest } = validationErrors
                      setValidationErrors(rest)
                    }
                  }}
                  readOnly={!isEditing}
                  required
                  data-testid="diet-start-date-input"
                />
                {validationErrors.start_date && (
                  <span className="text-sm text-destructive">{validationErrors.start_date}</span>
                )}
              </div>
              <div className="space-y-2">
                <Label>Data zakończenia</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    if (validationErrors.end_date) {
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { end_date, ...rest } = validationErrors
                      setValidationErrors(rest)
                    }
                  }}
                  readOnly={!isEditing}
                  placeholder="Otwarta"
                  data-testid="diet-end-date-input"
                />
                {validationErrors.end_date && (
                  <span className="text-sm text-destructive">{validationErrors.end_date}</span>
                )}
              </div>
              <div className="space-y-2">
                <Label>Dzienna porcja</Label>
                <Input type="text" value={`${Number(diet.total_daily_mass).toFixed(0)} g/dzień`} readOnly data-testid="diet-total-mass" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opis</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                readOnly={!isEditing}
                rows={3}
                placeholder="Opcjonalny opis diety..."
                data-testid="diet-description-input"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  Składniki dziennej porcji ({Number(diet.total_daily_mass).toFixed(0)} g)
                </span>
                <Button
                  variant="outline"
                  onClick={handleAddIngredient}
                  disabled={isAddingIngredient || editingIngredientId !== null}
                  data-testid="add-ingredient-button"
                >
                  Dodaj składnik
                </Button>
              </div>
            
            <div className="table table-with-actions" data-testid="ingredients-list">
              <div className="table-head">
                <span>Nazwa</span>
                <span>Kategoria</span>
                <span>Sposób</span>
                <span>Ilość</span>
                <span>Akcje</span>
              </div>
              
              {isAddingIngredient && (
                <div className="table-row ingredient-form-row">
                  <Input
                    type="text"
                    value={ingredientForm.name}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                    placeholder="Nazwa składnika"
                    autoFocus
                    data-testid="ingredient-name-input"
                  />
                  <Select
                    value={ingredientForm.category_id?.toString() || ''}
                    onValueChange={(value) => setIngredientForm({
                      ...ingredientForm,
                      category_id: value ? parseInt(value) : null
                    })}
                    data-testid="ingredient-category-select"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz kategorię" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredientCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="cooking_method_new"
                        value="raw"
                        checked={ingredientForm.cooking_method === 'raw'}
                        onChange={(e) => setIngredientForm({
                          ...ingredientForm,
                          cooking_method: e.target.value as 'raw' | 'cooked'
                        })}
                      />
                      Surowe
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="cooking_method_new"
                        value="cooked"
                        checked={ingredientForm.cooking_method === 'cooked'}
                        onChange={(e) => setIngredientForm({
                          ...ingredientForm,
                          cooking_method: e.target.value as 'raw' | 'cooked'
                        })}
                      />
                      Gotowane
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={ingredientForm.amount}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, amount: e.target.value })}
                      placeholder="0"
                      step="0.1"
                      min="0"
                      className="w-20"
                      data-testid="ingredient-amount-input"
                    />
                    <Select
                      value={ingredientForm.unit_id.toString()}
                      onValueChange={(value) => setIngredientForm({
                        ...ingredientForm,
                        unit_id: parseInt(value)
                      })}
                      data-testid="ingredient-unit-select"
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(unit => (
                          <SelectItem key={unit.id} value={unit.id.toString()}>{unit.symbol}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={handleCancelAddIngredient} title="Anuluj" data-testid="ingredient-cancel-button">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleSaveNewIngredient} title="Zapisz" data-testid="ingredient-save-button">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </Button>
                  </div>
                </div>
              )}
              
              {diet.ingredients?.map((ingredient: Ingredient) => (
                editingIngredientId === ingredient.id ? (
                  <div key={ingredient.id} className="table-row ingredient-form-row">
                    <Input
                      type="text"
                      value={ingredientForm.name}
                      onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                      placeholder="Nazwa składnika"
                    />
                    <Select
                      value={ingredientForm.category_id?.toString() || ''}
                      onValueChange={(value) => setIngredientForm({
                        ...ingredientForm,
                        category_id: value ? parseInt(value) : null
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz kategorię" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredientCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`cooking_method_${ingredient.id}`}
                          value="raw"
                          checked={ingredientForm.cooking_method === 'raw'}
                          onChange={(e) => setIngredientForm({
                            ...ingredientForm,
                            cooking_method: e.target.value as 'raw' | 'cooked'
                          })}
                        />
                        Surowe
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`cooking_method_${ingredient.id}`}
                          value="cooked"
                          checked={ingredientForm.cooking_method === 'cooked'}
                          onChange={(e) => setIngredientForm({
                            ...ingredientForm,
                            cooking_method: e.target.value as 'raw' | 'cooked'
                          })}
                        />
                        Gotowane
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={ingredientForm.amount}
                        onChange={(e) => setIngredientForm({ ...ingredientForm, amount: e.target.value })}
                        placeholder="0"
                        step="0.1"
                        min="0"
                        className="w-20"
                      />
                      <Select
                        value={ingredientForm.unit_id.toString()}
                        onValueChange={(value) => setIngredientForm({
                          ...ingredientForm,
                          unit_id: parseInt(value)
                        })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map(unit => (
                            <SelectItem key={unit.id} value={unit.id.toString()}>{unit.symbol}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={handleCancelEditIngredient} title="Anuluj">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleSaveEditIngredient} title="Zapisz">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={ingredient.id} className="table-row">
                    <span>{ingredient.name}</span>
                    <span className="muted">{ingredient.category?.name || '—'}</span>
                    <span className="muted">{ingredient.cooking_method === 'raw' ? 'Surowe' : 'Gotowane'}</span>
                    <span className="muted">{Number(ingredient.amount).toFixed(0)} {ingredient.unit.symbol}</span>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditIngredient(ingredient)}
                        disabled={isAddingIngredient || editingIngredientId !== null}
                        title="Edytuj"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingIngredientId(ingredient.id)}
                        disabled={isAddingIngredient || editingIngredientId !== null}
                        title="Usuń"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </Button>
                    </div>
                  </div>
                )
              ))}
              
              {!isAddingIngredient && (!diet.ingredients || diet.ingredients.length === 0) && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Brak składników. Kliknij "Dodaj składnik" aby rozpocząć.
                </div>
              )}
            </div>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* Modal potwierdzenia usunięcia */}
      <Dialog open={!!deletingIngredientId} onOpenChange={(open) => !open && setDeletingIngredientId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń składnik</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć <strong>{deletingIngredient?.name}</strong>?
              Spowoduje to przeliczenie dziennej porcji.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingIngredientId(null)}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleDeleteIngredient}>
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
