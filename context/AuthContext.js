
import React, {
  createContext,
  useState,
  useContext,
  useEffect
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext({
  usuarioLogado: null,
  token: null,
  carregandoAuth: true,
  setUsuarioLogado: () => {},
  login: async () => {},
  logout: async () => {}
});

export function AuthProvider({ children }) {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [token, setToken] = useState(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  // Recupera a sessão salva no dispositivo.
  useEffect(() => {
    async function recuperarSessao() {
      try {
        const tokenSalvo = await AsyncStorage.getItem("token");
        const usuarioSalvo = await AsyncStorage.getItem("usuario");

        if (tokenSalvo && usuarioSalvo) {
          setToken(tokenSalvo);
          setUsuarioLogado(JSON.parse(usuarioSalvo));
        }
      } catch (erro) {
        console.error("Erro ao recuperar sessão:", erro);
      } finally {
        setCarregandoAuth(false);
      }
    }

    recuperarSessao();
  }, []);

  // Salva os dados recebidos pelo login.
  async function login(usuario, novoToken) {
    await AsyncStorage.setItem("token", novoToken);
    await AsyncStorage.setItem("usuario", JSON.stringify(usuario));

    setToken(novoToken);
    setUsuarioLogado(usuario);
  }

  // Encerra a sessão.
  async function logout() {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("usuario");

    setToken(null);
    setUsuarioLogado(null);
  }

  return (
    <AuthContext.Provider
      value={{
        usuarioLogado,
        token,
        carregandoAuth,
        setUsuarioLogado,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}