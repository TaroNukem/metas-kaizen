import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

type AuthContextType = {
    usuario: User | null
    carregando: boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [usuario, setUsuario] = useState<User | null>(null)
    const [carregando, setCarregando] = useState(true)

    useEffect(() => {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
            setUsuario(session?.user ?? null)
            setCarregando(false)
        })

        return () => {
            data.subscription.unsubscribe()
        }
    }, [])

    return (
        <AuthContext.Provider value={{ usuario, carregando }}>
            {children}
        </AuthContext.Provider>
    )
}