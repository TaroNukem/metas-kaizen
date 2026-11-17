import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Cadastro(){
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')

    async function cadastrarUsuario(){
        const { error } = await supabase.auth.signUp({
            email: email,
            password: senha
        })

        if(error){
            alert(error.message)
            return
        }
        alert('Cadastro realizado com sucesso!')
    }

    return(
        <div>
            
            <form onSubmit={(e) =>{
                e.preventDefault()
                cadastrarUsuario()
            }}>
                <div>
                    <label htmlFor="email">E-mail</label>
                    <input type="email" id="email" placeholder="Digite seu email" value={email} onChange={(e) =>{setEmail(e.target.value)}} />
                </div>

                <div>
                    <label htmlFor="senha">Senha</label>
                    <input type="password" id="senha" placeholder="Digite sua senha" value={senha} onChange={(e)=> setSenha(e.target.value)}/>
                </div>

                <button type="submit">Criar conta</button>

            </form>
        </div>
    )
}