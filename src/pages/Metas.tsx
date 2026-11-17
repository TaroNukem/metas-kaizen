import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

type Meta ={
    id: string,
    titulo: string,
    data: string;
    concluida: boolean
}

export default function Metas(){
    const [titulo, setTitulo] = useState("")
    const [data, setData] = useState("")
    const [metas, setMetas] = useState<Meta[]>([])

    async function buscarMetas(){
        const { data:usuarioData } = await supabase.auth.getUser()

        if(!usuarioData.user){
            alert("Você precisa estar logado!")
            return
        }

        const { data, error } = await supabase
      .from("metas")
      .select("*")
      .eq("user_id", usuarioData.user.id)
      .order("data", { ascending: true })

      if(error){
        alert("Erro ao buscar metas: " + error.message)
        return
      }

      setMetas(data || [])
    }

    async function concluirMeta(id: string, concluida: boolean){
        const { error } = await supabase
        .from("metas")
        .update({ concluida: concluida })
        .eq("id", id)

        if(error){
            alert("Erro ao atualizar meta: " + error.message)
            return
        }

        buscarMetas()
    }

    async function adicionarMetas(e: React.FormEvent){
        e.preventDefault()

        const { data:usuarioData } = await supabase.auth.getUser()

        if(!usuarioData.user){
            alert("Você precisa estar logado!")
            return
        }

        const { error } = await supabase.from("metas").insert({
            titulo:titulo,
            data:data,
            user_id: usuarioData.user.id
        })

        if(error){
            alert("Erro ao adicionar meta: " + error.message)
            return
        }

        alert("Meta adicionada com sucesso!")

        useEffect(() => {
    buscarMetas();
}, []);
    }

    useEffect(() => {
    buscarMetas();
}, []);

    return(
        <div>
            <h1>Minhas metas</h1>

            <form onSubmit={adicionarMetas}>
                <div>
                    <label htmlFor="titulo">Nome da meta</label>
                    <input type="text" id="titulo" placeholder="Ex: Estudar Programação" value={titulo} onChange={(e) => setTitulo(e.target.value)} required/>
                </div>

                <div>
                    <label htmlFor="data">Data da meta</label>
                    <input type="date" id="data" value={data} onChange={(e)=> setData(e.target.value)}
                    required/>
                </div>

                <button type="submit">Adicionar meta</button>
            </form>

            <h2>Minhas metas cadastradas</h2>

            {metas.length === 0 ? (
        <p>Você ainda não possui metas cadastradas.</p>
      ) : (
        <ul>
          {metas.map((meta) => (
            <li key={meta.id}>
              <input type="checkbox" checked={meta.concluida} onChange={(e)=> concluirMeta(meta.id, e.target.checked)} />

              <span>{meta.titulo}</span> - {meta.data}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}