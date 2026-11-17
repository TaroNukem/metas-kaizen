import { Navigate } from "react-router-dom"
import { useContext } from "react"
import { AuthContext } from "../context/AuthContext"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const auth = useContext(AuthContext)

    if (!auth) {
        throw new Error("ProtectedRoute precisa estar dentro de AuthProvider")
    }

    if (auth.carregando) {
        return <p>Carregando...</p>
    }

    if (!auth.usuario) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}