import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [isRegistro, setIsRegistro] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (isRegistro) {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      });
      if (error) setErro(error.message);
      else alert('Cadastro realizado! Verifique seu email para confirmar.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setErro(error.message);
      else onLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold text-green-800 text-center">
          {isRegistro ? 'Criar conta' : 'Acessar depósito'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {isRegistro && (
            <input
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-600"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-600"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-green-600"
            required
          />
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
          <button
            type="submit"
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-xl transition"
          >
            {isRegistro ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-sm mt-4">
          {isRegistro ? 'Já tem conta?' : 'Não tem conta?'}{' '}
          <button
            onClick={() => setIsRegistro(!isRegistro)}
            className="text-green-700 font-medium hover:underline"
          >
            {isRegistro ? 'Faça login' : 'Cadastre-se'}
          </button>
        </p>
      </div>
    </div>
  );
}
