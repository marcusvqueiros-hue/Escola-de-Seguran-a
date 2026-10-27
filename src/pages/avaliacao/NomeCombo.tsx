import { useEffect, useId, useRef, useState } from "react";
import { chaveNome } from "../../shared/texto";

interface Sugestao {
  id: number;
  nome: string;
  base: string;
  matricula: string;
}

interface Props {
  valor: string;
  onChange: (nome: string) => void;
  onEscolher: (s: Sugestao) => void;
  onEnter: () => void;
}

function destacar(nome: string, q: string) {
  const i = chaveNome(nome).indexOf(chaveNome(q));
  if (!q.trim() || i < 0) return nome;
  return (
    <>
      {nome.slice(0, i)}
      <mark>{nome.slice(i, i + q.trim().length)}</mark>
      {nome.slice(i + q.trim().length)}
    </>
  );
}

export default function NomeCombo({ valor, onChange, onEscolher, onEnter }: Props) {
  const [lista, setLista] = useState<Sugestao[]>([]);
  const [aberta, setAberta] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const id = useId();
  const escolhido = useRef(false);

  useEffect(() => {
    if (escolhido.current) {
      escolhido.current = false;
      return;
    }
    if (valor.trim().length < 2) {
      setLista([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/colaboradores?q=${encodeURIComponent(valor.trim())}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((d) => {
          setLista(d.resultados ?? []);
          setAtivo(-1);
          setAberta(true);
        })
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [valor]);

  const escolher = (s: Sugestao) => {
    escolhido.current = true;
    setAberta(false);
    setLista([]);
    onEscolher(s);
  };

  return (
    <div className="combo">
      <label className="campo-grande">
        <input
          autoFocus
          role="combobox"
          aria-expanded={aberta && lista.length > 0}
          aria-controls={id}
          aria-autocomplete="list"
          value={valor}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setAberta(true);
          }}
          onBlur={() => setTimeout(() => setAberta(false), 120)}
          onFocus={() => lista.length && setAberta(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && lista.length) {
              e.preventDefault();
              setAberta(true);
              setAtivo((a) => (a + 1) % lista.length);
            } else if (e.key === "ArrowUp" && lista.length) {
              e.preventDefault();
              setAtivo((a) => (a <= 0 ? lista.length - 1 : a - 1));
            } else if (e.key === "Escape") setAberta(false);
            else if (e.key === "Enter") {
              if (aberta && ativo >= 0 && lista[ativo]) escolher(lista[ativo]!);
              else onEnter();
            }
          }}
          placeholder="Digite seu nome"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <span className="linha" />
      </label>
      {aberta && lista.length > 0 && (
        <ul className="combo-lista" id={id} role="listbox">
          {lista.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === ativo}
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(s);
              }}
              onMouseEnter={() => setAtivo(i)}
            >
              <span>{destacar(s.nome, valor)}</span>
              <small>{s.base} · {s.matricula}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
