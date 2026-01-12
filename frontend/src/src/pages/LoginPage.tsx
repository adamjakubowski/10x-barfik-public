import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { Location } from 'react-router-dom'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../hooks/useAuth'
import logo from '../assets/logo.png'

const loginSchema = z.object({
  email: z.string().email('Podaj poprawny adres e-mail'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
  remember: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard'
  const registrationSuccess = (location.state as { registrationSuccess?: boolean })?.registrationSuccess

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.email, values.password, values.remember)
      navigate(from, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Wystąpił błąd podczas logowania'
      setError('root', { message })
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
          <h1>Zaloguj się</h1>
          <p className="muted">Dostęp do planów BARF, diet i checklist zakupowych.</p>
        </div>
        {registrationSuccess && (
          <div className="success-message" style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '4px'
          }}>
            Konto zostało utworzone! Możesz się teraz zalogować.
          </div>
        )}
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="field">
            <span>Email</span>
            <input 
              type="email" 
              autoComplete="email" 
              placeholder="uzytkownik@barfik.pl" 
              data-testid="login-email"
              {...register('email')} 
            />
            {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
          </label>

          <label className="field">
            <span>Hasło</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Min. 8 znaków"
              data-testid="login-password"
              {...register('password')}
            />
            {errors.password ? <span className="field-error">{errors.password.message}</span> : null}
          </label>

          <label className="field checkbox-field">
            <input type="checkbox" defaultChecked {...register('remember')} />
            <span>Zapamiętaj mnie na tym urządzeniu</span>
          </label>

          {errors.root ? <span className="field-error" data-testid="login-error">{errors.root.message}</span> : null}

          <button className="primary" type="submit" disabled={isSubmitting} data-testid="login-submit">
            {isSubmitting ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>
        <p className="auth-foot">
          Nie masz konta? <Link to="/register">Zarejestruj się</Link> 
          
        </p>
      </div>
    </div>
  )
}
