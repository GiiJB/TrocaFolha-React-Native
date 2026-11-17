import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";

import Header from "../components/global/Header";
import Footer from "../components/global/Footer";
import AcervoCard from "../components/cards/AcervoCard";
import FiltroDesapegaModal from "../components/modals/FiltroDesapegaModal";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

import { CORES } from "../constants/themes";
import { LINKS_RAPIDOS } from "../constants/Navbar";
import { styles as acervoStyles } from "../styles/acervoStyles";
import API_URL from "../api";

export default function TelaDesapega({ navigation }) {
  const route = useRoute();

  const { adicionarItem } = useCart();
  const { usuarioLogado, token } = useAuth();

  const [livros, setLivros] = useState([]);
  const [buscaBarra, setBuscaBarra] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  // Estados dos filtros
  const [areaSelecionada, setAreaSelecionada] = useState("");
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [filtroVisivel, setFiltroVisivel] = useState(false);

  // Exibir mensagem de retorno da edição ou cadastro
  useEffect(() => {
    if (route.params?.feedbackAcao) {
      setMensagemSucesso(route.params.feedbackAcao);

      navigation.setParams({ feedbackAcao: undefined });
    }
  }, [route.params?.feedbackAcao]);

  // Buscar anúncios do Desapega Uni
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregarLivros() {
        try {
          setCarregando(true);

          const resposta = await fetch(
            `${API_URL}/api/produtos?desapega=true`
          );

          const dados = await resposta.json();

          if (!resposta.ok) {
            throw new Error(
              dados.erro || "Não foi possível carregar os anúncios."
            );
          }

          if (ativo) {
            const lista = (dados.produtos || []).map((livro) => ({
              ...livro,
              id: livro.id_produto,
              preco: Number(livro.preco),
              imagem: livro.imagem_url || livro.imagem || null,
            }))

            setLivros(lista);
          }
        } catch (erro) {
          if (ativo) {
            Alert.alert("Erro", erro.message);
          }
        } finally {
          if (ativo) {
            setCarregando(false);
          }
        }
      }

      carregarLivros();

      return () => {
        ativo = false;
      };
    }, [])
  );

  // Busca e filtros
  const livrosFiltrados = useMemo(() => {
    const buscaLower = buscaBarra.trim().toLowerCase();

    const minNum =
      precoMin === ""
        ? null
        : parseFloat(String(precoMin).replace(",", "."));

    const maxNum =
      precoMax === ""
        ? null
        : parseFloat(String(precoMax).replace(",", "."));

    return livros.filter((livro) => {
      const titulo = String(livro.titulo || "").toLowerCase();
      const autor = String(livro.autor || "").toLowerCase();

      const bateBusca =
        buscaLower === "" ||
        titulo.includes(buscaLower) ||
        autor.includes(buscaLower);

      // A área acadêmica vem do campo area do banco
      const bateArea =
        areaSelecionada === "" ||
        livro.area === areaSelecionada;

      const preco = Number(livro.preco);

      const batePrecoMin =
        minNum == null || isNaN(minNum) || preco >= minNum;

      const batePrecoMax =
        maxNum == null || isNaN(maxNum) || preco <= maxNum;

      return (
        bateBusca &&
        bateArea &&
        batePrecoMin &&
        batePrecoMax
      );
    });
  }, [livros, buscaBarra, areaSelecionada, precoMin, precoMax]);

  // Abrir detalhes do produto
  function abrirProduto(livro) {
    navigation.navigate("Produto", {
      produto: livro,
    });
  }

  // Adicionar ao carrinho
  function handleAdicionar(livro) {
    adicionarItem(livro);
  }

  // Editar anúncio
  function handleEditar(livro) {
    navigation.navigate("Anunciar", {
      produto: livro,
    });
  }

  // Excluir anúncio pela API
  async function handleApagar(livro) {
    if (!token) {
      Alert.alert(
        "Atenção",
        "Você precisa estar logado para excluir um anúncio."
      );
      return;
    }

    try {
      const resposta = await fetch(
        `${API_URL}/api/produtos/${livro.id_produto}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível excluir o anúncio."
        );
      }

      // Remover da lista somente após confirmação do backend
      setLivros((atual) =>
        atual.filter(
          (item) => item.id_produto !== livro.id_produto
        )
      );

      setMensagemSucesso(
        dados.mensagem || "Anúncio excluído com sucesso."
      );
    } catch (erro) {
      Alert.alert("Erro ao excluir", erro.message);
    }
  }

  // Aplicar filtros
  function handleAplicarFiltro({ area, min, max }) {
    setAreaSelecionada(area);
    setPrecoMin(min);
    setPrecoMax(max);
  }

  return (
    <View style={acervoStyles.tela}>
      <Header
        navigation={navigation}
        busca={buscaBarra}
        setBusca={setBuscaBarra}
        onAbrirCategorias={() => setFiltroVisivel(true)}
        linksRapidos={LINKS_RAPIDOS}
      />

      <FlatList
        data={livrosFiltrados}
        keyExtractor={(item) => String(item.id_produto)}
        contentContainerStyle={acervoStyles.scrollContent}

        ListHeaderComponent={
          <>
            <Text style={acervoStyles.tituloTopo}>
              Iniciativa Desapega Uni
            </Text>

            <Text style={styles.textoDescritivo}>
              Facilitando o acesso ao conhecimento universitário
              através da economia colaborativa. Encontre aqui livros
              e materiais acadêmicos com preços acessíveis.
            </Text>

            {mensagemSucesso !== "" && (
              <View style={styles.mensagemSucesso}>
                <Text style={styles.textoSucesso}>
                  ✓ {mensagemSucesso}
                </Text>
              </View>
            )}

            <View style={acervoStyles.barraFiltro}>
              <Text style={acervoStyles.contadorTexto}>
                {livrosFiltrados.length}{" "}
                {livrosFiltrados.length === 1
                  ? "resultado"
                  : "resultados"}
              </Text>

              <TouchableOpacity
                style={acervoStyles.btnFiltros}
                onPress={() => setFiltroVisivel(true)}
              >
                <Ionicons
                  name="options-outline"
                  size={16}
                  color={CORES.dark}
                />

                <Text style={acervoStyles.btnFiltrosTexto}>
                  Filtros
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }

        renderItem={({ item }) => (
          <AcervoCard
            livro={item}
            usuarioLogado={usuarioLogado}
            onPress={abrirProduto}
            onAdicionar={handleAdicionar}
            onEditar={handleEditar}
            onApagar={handleApagar}
          />
        )}

        ListEmptyComponent={
          carregando ? (
            <View style={acervoStyles.listaVazia}>
              <ActivityIndicator
                size="large"
                color={CORES.accent}
              />

              <Text style={acervoStyles.listaVaziaTexto}>
                Carregando materiais...
              </Text>
            </View>
          ) : (
            <View style={acervoStyles.listaVazia}>
              <Text style={acervoStyles.listaVaziaTexto}>
                Nenhum material encontrado com esses filtros.
              </Text>
            </View>
          )
        }

        ListFooterComponent={<Footer />}
      />

      <FiltroDesapegaModal
        visible={filtroVisivel}
        onFechar={() => setFiltroVisivel(false)}
        areaSelecionada={areaSelecionada}
        precoMin={precoMin}
        precoMax={precoMax}
        onAplicar={handleAplicarFiltro}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  textoDescritivo: {
    paddingHorizontal: 16,
    marginBottom: 20,
    color: CORES.muted || "#64748b",
    fontSize: 15,
    lineHeight: 22,
  },

  mensagemSucesso: {
    backgroundColor: "#dcfce7",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 15,
    borderRadius: 8,
  },

  textoSucesso: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "600",
  },
});