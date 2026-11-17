import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

const CartContext = createContext({
  itens: [],
  adicionarItem: () => {},
  removerItem: () => {},
  alterarQuantidade: () => {},
  total: 0,
  carregandoCarrinho: true,
});

const CHAVE_CARRINHO = "@troca_folha:carrinho";

export function CartProvider({ children }) {
  const { usuarioLogado, carregandoAuth } = useAuth();

  const [itens, setItens] = useState([]);
  const [carregandoCarrinho, setCarregandoCarrinho] = useState(true);

  const idUsuario = usuarioLogado?.id_usuario;

  // Recupera o carrinho do usuário logado
  useEffect(() => {
    let ativo = true;

    async function carregarCarrinho() {
      setCarregandoCarrinho(true);
      setItens([]);

      if (carregandoAuth) return;

      if (!idUsuario) {
        setCarregandoCarrinho(false);
        return;
      }

      try {
        const chave = `${CHAVE_CARRINHO}:${idUsuario}`;
        const dadosSalvos = await AsyncStorage.getItem(chave);

        if (ativo && dadosSalvos) {
          setItens(JSON.parse(dadosSalvos));
        }
      } catch (erro) {
        console.error("Erro ao carregar carrinho:", erro);
      } finally {
        if (ativo) {
          setCarregandoCarrinho(false);
        }
      }
    }

    carregarCarrinho();

    return () => {
      ativo = false;
    };
  }, [idUsuario, carregandoAuth]);

  // Salva o carrinho do usuário atual
  useEffect(() => {
    if (carregandoAuth || carregandoCarrinho || !idUsuario) return;

    async function salvarCarrinho() {
      try {
        const chave = `${CHAVE_CARRINHO}:${idUsuario}`;

        await AsyncStorage.setItem(
          chave,
          JSON.stringify(itens)
        );
      } catch (erro) {
        console.error("Erro ao salvar carrinho:", erro);
      }
    }

    salvarCarrinho();
  }, [itens, idUsuario, carregandoAuth, carregandoCarrinho]);

  function adicionarItem(produto) {
    if (!idUsuario) return;

    setItens((atual) => {
      const existente = atual.find(
        (item) => item.id === produto.id
      );

      if (existente) {
        return atual.map((item) =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }

      return [...atual, { ...produto, quantidade: 1 }];
    });
  }

  function removerItem(id) {
    setItens((atual) =>
      atual.filter((item) => item.id !== id)
    );
  }

  function alterarQuantidade(id, quantidade) {
    if (quantidade < 1) return;

    setItens((atual) =>
      atual.map((item) =>
        item.id === id
          ? { ...item, quantidade }
          : item
      )
    );
  }

  function limparCarrinho() {
  setItens([]);
}

  const total = itens.reduce(
    (soma, item) =>
      soma + Number(item.preco) * item.quantidade,
    0
  );

  return (
    <CartContext.Provider
      value={{
        itens,
        adicionarItem,
        removerItem,
        alterarQuantidade,
        limparCarrinho,
        total,
        carregandoCarrinho,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}