import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import logo from '../assets/logo.png'

const registerSchema = z.object({
  email: z.string().email('Podaj poprawny adres e-mail'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'Imię jest wymagane').max(150, 'Imię może mieć maksymalnie 150 znaków'),
  lastName: z.string().min(1, 'Nazwisko jest wymagane').max(150, 'Nazwisko może mieć maksymalnie 150 znaków'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Hasła muszą być identyczne',
  path: ['confirmPassword'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { isAuthenticated, register } = useAuth()
  const navigate = useNavigate()

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', firstName: '', lastName: '' },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await register(values.email, values.password, values.firstName, values.lastName)
      navigate('/login', { state: { registrationSuccess: true }, replace: true })
    } catch (err) {
      // Handle Axios errors with field-specific validation messages
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data
        let hasFieldError = false

        // Map backend field names to form field names and set errors
        const fieldMapping: Record<string, keyof RegisterFormValues> = {
          email: 'email',
          password: 'password',
          first_name: 'firstName',
          last_name: 'lastName',
        }

        // Handle field-specific errors
        Object.entries(fieldMapping).forEach(([backendField, formField]) => {
          if (data[backendField]) {
            const errorMessage = Array.isArray(data[backendField])
              ? data[backendField][0]
              : data[backendField]
            setError(formField, { message: errorMessage })
            hasFieldError = true
          }
        })

        // Handle non-field errors (like detail)
        if (data.detail && !hasFieldError) {
          setError('root', { message: data.detail })
        } else if (!hasFieldError && typeof data === 'object') {
          // If there are other field errors not in mapping, show generic message
          const firstError = Object.values(data)[0]
          const message = Array.isArray(firstError) ? firstError[0] : firstError
          setError('root', { message: typeof message === 'string' ? message : 'Wystąpił błąd podczas rejestracji' })
        }
      } else {
        // Non-axios errors
        const message = err instanceof Error ? err.message : 'Wystąpił błąd podczas rejestracji'
        setError('root', { message })
      }
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" role="main">
        <div className="auth-head">
          <img src={logo} alt="Barfik" className="auth-logo" />
          <h1>Zarejestruj się</h1>
          <p className="muted">Stwórz konto, aby zarządzać dietami BARF dla swoich pupili.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="uzytkownik@barfik.pl"
              data-testid="register-email"
              {...registerField('email')}
            />
            {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
          </label>

          <label className="field">
            <span>Imię</span>
            <input
              type="text"
              autoComplete="given-name"
              placeholder="Jan"
              data-testid="register-firstName"
              {...registerField('firstName')}
            />
            {errors.firstName ? <span className="field-error">{errors.firstName.message}</span> : null}
          </label>

          <label className="field">
            <span>Nazwisko</span>
            <input
              type="text"
              autoComplete="family-name"
              placeholder="Kowalski"
              data-testid="register-lastName"
              {...registerField('lastName')}
            />
            {errors.lastName ? <span className="field-error">{errors.lastName.message}</span> : null}
          </label>

          <label className="field">
            <span>Hasło</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 znaków"
              data-testid="register-password"
              {...registerField('password')}
            />
            {errors.password ? <span className="field-error">{errors.password.message}</span> : null}
          </label>

          <label className="field">
            <span>Powtórz hasło</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Powtórz hasło"
              data-testid="register-confirmPassword"
              {...registerField('confirmPassword')}
            />
            {errors.confirmPassword ? <span className="field-error">{errors.confirmPassword.message}</span> : null}
          </label>

          {errors.root ? <span className="field-error" data-testid="register-error">{errors.root.message}</span> : null}

          <button className="primary" type="submit" disabled={isSubmitting} data-testid="register-submit">
            {isSubmitting ? 'Rejestracja...' : 'Zarejestruj się'}
          </button>
        </form>
        <p className="auth-foot">
          Masz już konto? <Link to="/login">Zaloguj się</Link>.
        </p>
      </div>
    </div>
  )
}
