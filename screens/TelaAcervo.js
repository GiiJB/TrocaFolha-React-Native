import React, { useState, useMemo, useCallback, useEffect } from "react";

import { View, Text, FlatList, ScrollView, TouchableOpacity, Image, Linking, Alert, ActivityIndicator } from "react-native";

import { useRoute, useFocusEffect, } from "@react-navigation/native";

import { Ionicons } from "@expo/vector-icons";

import Header from "../components/global/Header";
import Footer from "../components/global/Footer";
import AcervoCard from "../components/cards/AcervoCard";
import FiltroAcervoModal from "../components/modals/FiltroAcervoModal";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { CORES } from "../constants/themes";
import { LINKS_RAPIDOS } from "../constants/Navbar";
import { styles } from "../styles/acervoStyles";
import API_URL from "../api";

export default function TelaAcervo({ navigation }) {
  const route = useRoute();
  const { adicionarItem } = useCart();
  const { usuarioLogado, token } = useAuth();

  const [livros, setLivros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  useEffect(() => {
    if (route.params?.feedbackAcao) {
      setMensagemSucesso(route.params.feedbackAcao);

      navigation.setParams({
        feedbackAcao: undefined,
      });
    }
  }, [route.params?.feedbackAcao]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregarLivros() {
        try {
          setCarregando(true);

          const resposta = await fetch(`${API_URL}/api/produtos`);

          if (!resposta.ok) {
            throw new Error("Não foi possível carregar os livros.");
          }

          const dados = await resposta.json();

          if (ativo) {
            setLivros(
              (dados.produtos || []).map((livro) => ({
                ...livro,
                id: livro.id_produto,
                preco: Number(livro.preco),
                imagem: livro.imagem_url || livro.imagem || null,
              }))
            );
          }
        } catch (erro) {
          console.error("Erro ao carregar acervo:", erro);

          if (ativo) {
            Alert.alert(
              "Erro",
              "Não foi possível carregar o acervo. Verifique se o backend está funcionando."
            );
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

  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(route.params?.categoria || "");
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [filtroVisivel, setFiltroVisivel] = useState(false);

  const livrosFiltrados = useMemo(() => {
    const buscaLower = busca.trim().toLowerCase();
    const minNum = precoMin === "" ? null : parseFloat(String(precoMin).replace(",", "."));
    const maxNum = precoMax === "" ? null : parseFloat(String(precoMax).replace(",", "."));

    return livros.filter((livro) => {
      const titulo = String(livro.titulo || "").toLowerCase();
      const autor = String(livro.autor || "").toLowerCase();

      const bateBusca =
        buscaLower === "" ||
        titulo.includes(buscaLower) ||
        autor.includes(buscaLower);
      // CORREÇÃO AQUI: Garante que se veio uma categoria da rota, ela bate com o livro.
      // Usamos .trim() para evitar problemas com espaços extras.
      const bateCategoria =
        !categoriaSelecionada ||
        categoriaSelecionada === "" ||
        (livro.categoria && livro.categoria.trim().toLowerCase() === categoriaSelecionada.trim().toLowerCase());

      const batePrecoMin = minNum == null || isNaN(minNum) || livro.preco >= minNum;
      const batePrecoMax = maxNum == null || isNaN(maxNum) || livro.preco <= maxNum;

      return bateBusca && bateCategoria && batePrecoMin && batePrecoMax;
    });
  }, [livros, busca, categoriaSelecionada, precoMin, precoMax]);

  function abrirProduto(livro) {
    navigation.navigate("Produto", { produto: livro });
  }

  function handleAdicionar(livro) {
    adicionarItem(livro);
  }

  function handleEditar(livro) {
    navigation.navigate("Anunciar", {
      produto: livro,
    });
  }


  async function handleApagar(livro) {
    try {
      if (!token) {
        Alert.alert(
          "Atenção",
          "Você precisa estar logado para excluir um anúncio."
        );
        return;
      }

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

      setLivros((atual) =>
        atual.filter(
          (item) => item.id_produto !== livro.id_produto
        )
      );

      setMensagemSucesso(
        dados.mensagem || "Anúncio excluído com sucesso!"
      );

    } catch (erro) {
      console.error("Erro ao excluir anúncio:", erro);

      Alert.alert(
        "Erro",
        erro.message || "Não foi possível conectar ao servidor."
      );
    }
  }


  function handleAplicarFiltro({ categoria, min, max }) {
    setCategoriaSelecionada(categoria);
    setPrecoMin(min);
    setPrecoMax(max);
  }

  function selecionarLinkRapido(label) {
    // "Coleções" -> Colecoes | "Desapega Uni" -> Desapega | "Anuncie seu livro!" -> Anunciar
    // ainda não migradas, sem ação por enquanto.
  }

  return (
    <View style={styles.tela}>
      <Header
        navigation={navigation}
        busca={busca}
        setBusca={setBusca}
        onAbrirCategorias={() => setFiltroVisivel(true)}
        linksRapidos={LINKS_RAPIDOS}
        onSelecionarLink={selecionarLinkRapido}
      />

      {mensagemSucesso !== "" && (
        <View
          style={{
            backgroundColor: "#dcfce7",
            padding: 14,
            marginHorizontal: 16,
            marginTop: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#86efac",
          }}
        >
          <Text style={{ color: "#166534", fontWeight: "600" }}>
            ✓ {mensagemSucesso}
          </Text>
        </View>
      )}

      <FlatList
        data={livrosFiltrados}
        keyExtractor={(item) => String(item.id_produto)}
        contentContainerStyle={styles.scrollContent}

        // Componente do Topo (Título e barra de filtro)
        ListHeaderComponent={
          <>

            <View style={styles.barraFiltro}>
              <Text style={styles.contadorTexto}>
                {livrosFiltrados.length} {livrosFiltrados.length === 1 ? "resultado" : "resultados"}
              </Text>
              <TouchableOpacity style={styles.btnFiltros} onPress={() => setFiltroVisivel(true)}>
                <Ionicons name="options-outline" size={16} color={CORES.dark} />
                <Text style={styles.btnFiltrosTexto}>Filtros</Text>
              </TouchableOpacity>
            </View>
          </>
        }

        // Renderização individual dos Cards
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

        // Componente de Lista Vazia
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator size="large" />
          ) : (
            <View style={styles.listaVazia}>
              <Text style={styles.listaVaziaTexto}>
                Nenhum livro encontrado com esses filtros.
              </Text>
            </View>
          )
        }

        // Componente do Rodapé (Footer)
        ListFooterComponent={<Footer />}
      />

      <FiltroAcervoModal
        visible={filtroVisivel}
        onFechar={() => setFiltroVisivel(false)}
        categoriaSelecionada={categoriaSelecionada}
        precoMin={precoMin}
        precoMax={precoMax}
        onAplicar={handleAplicarFiltro}
      />
    </View>
  );
}