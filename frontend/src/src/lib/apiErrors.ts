import axios from 'axios'

/**
 * Wyciąga czytelny komunikat błędu z odpowiedzi API.
 * Obsługuje różne formaty błędów z Django REST Framework.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Błąd sieci
    if (!error.response) {
      return 'Brak połączenia z serwerem. Sprawdź połączenie internetowe.'
    }

    const { status, data } = error.response

    // 401 - Unauthorized
    if (status === 401) {
      return 'Sesja wygasła. Zaloguj się ponownie.'
    }

    // 403 - Forbidden
    if (status === 403) {
      return 'Brak uprawnień do wykonania tej operacji.'
    }

    // 404 - Not Found
    if (status === 404) {
      return 'Nie znaleziono zasobu.'
    }

    // 500 - Server Error
    if (status >= 500) {
      return 'Błąd serwera. Spróbuj ponownie później.'
    }

    // DRF validation errors (400)
    if (data && typeof data === 'object') {
      // non_field_errors
      if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
        return data.non_field_errors.join(', ')
      }

      // detail (ogólny komunikat)
      if (data.detail && typeof data.detail === 'string') {
        return data.detail
      }

      // field errors (np. { email: ["Email jest wymagany"] })
      const fieldErrors: string[] = []
      for (const [, messages] of Object.entries(data)) {
        if (Array.isArray(messages)) {
          fieldErrors.push(...messages)
        } else if (typeof messages === 'string') {
          fieldErrors.push(messages)
        }
      }
      if (fieldErrors.length > 0) {
        return fieldErrors.join(', ')
      }
    }

    return `Błąd ${status}: ${error.message}`
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Wystąpił nieoczekiwany błąd.'
}
