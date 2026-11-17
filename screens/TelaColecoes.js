import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRoute, useFocusEffect } from "@react-navigation/native";

import { Ionicons } from "@expo/vector-icons";

import Header from "../components/global/Header";
import Footer from "../components/global/Footer";
import AcervoCard from "../components/cards/AcervoCard";
import FiltroColecoesModal from "../components/modals/FiltroColecoesModal";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { CORES } from "../constants/themes";
import { LINKS_RAPIDOS } from "../constants/Navbar";
import { styles as acervoStyles } from "../styles/acervoStyles";
import API_URL from "../api";

export default function TelaColecoes({ navigation }) {
  const route = useRoute();

  const { adicionarItem } = useCart();
  const { usuarioLogado, token } = useAuth();

  // Dados das coleções
  const [colecoes, setColecoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  // Exibir mensagem recebida de outra tela
  useEffect(() => {
    if (route.params?.feedbackAcao) {
      setMensagemSucesso(route.params.feedbackAcao);

      navigation.setParams({
        feedbackAcao: undefined,
      });
    }
  }, [route.params?.feedbackAcao]);

  // Carregar coleções sempre que a tela receber foco
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregarColecoes() {
        try {
          setCarregando(true);

          const resposta = await fetch(
            `${API_URL}/api/produtos?colecao=true`
          );

          if (!resposta.ok) {
            throw new Error("Não foi possível carregar as coleções.");
          }

          const dados = await resposta.json();

          if (ativo) {
            setColecoes(
              (dados.produtos || []).map((livro) => ({
                ...livro,
                id: livro.id_produto,
                preco: Number(livro.preco),
                imagem: livro.imagem_url || livro.imagem || null,
              }))
            );
          }
        } catch (erro) {
          console.error("Erro ao carregar coleções:", erro);

          if (ativo) {
            Alert.alert(
              "Erro",
              "Não foi possível carregar as coleções. Verifique se o backend está funcionando."
            );
          }
        } finally {
          if (ativo) {
            setCarregando(false);
          }
        }
      }

      carregarColecoes();

      return () => {
        ativo = false;
      };
    }, [])
  );

  // Busca e filtros
  const [buscaBarra, setBuscaBarra] = useState("");
  const [filtroTitulo, setFiltroTitulo] = useState("");
  const [filtroAutor, setFiltroAutor] = useState("");
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [filtroVisivel, setFiltroVisivel] = useState(false);

  const colecoesFiltradas = useMemo(() => {
    const buscaLower = buscaBarra.trim().toLowerCase();
    const tituloLower = filtroTitulo.trim().toLowerCase();
    const autorLower = filtroAutor.trim().toLowerCase();

    const minNum =
      precoMin === ""
        ? null
        : parseFloat(String(precoMin).replace(",", "."));

    const maxNum =
      precoMax === ""
        ? null
        : parseFloat(String(precoMax).replace(",", "."));

    return colecoes.filter((item) => {
      const titulo = String(item.titulo || "").toLowerCase();
      const autor = String(item.autor || "").toLowerCase();

      // Busca rápida por título ou autor
      const bateBuscaBarra =
        buscaLower === "" ||
        titulo.includes(buscaLower) ||
        autor.includes(buscaLower);

      // Filtros do modal
      const bateTitulo =
        tituloLower === "" || titulo.includes(tituloLower);

      const bateAutor =
        autorLower === "" || autor.includes(autorLower);

      const batePrecoMin =
        minNum == null || isNaN(minNum) || item.preco >= minNum;

      const batePrecoMax =
        maxNum == null || isNaN(maxNum) || item.preco <= maxNum;

      return (
        bateBuscaBarra &&
        bateTitulo &&
        bateAutor &&
        batePrecoMin &&
        batePrecoMax
      );
    });
  }, [
    colecoes,
    buscaBarra,
    filtroTitulo,
    filtroAutor,
    precoMin,
    precoMax,
  ]);

  // Abrir detalhes do produto
  function abrirProduto(livro) {
    navigation.navigate("Produto", { produto: livro });
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

  // Excluir anúncio do banco de dados
  async function handleApagar(livro) {
    try {
      if (!token) {
        Alert.alert(
          "Atenção",
          "Você precisa estar logado para excluir uma coleção."
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
          dados.erro || "Não foi possível excluir a coleção."
        );
      }

      // Atualiza a lista somente após a confirmação do backend
      setColecoes((atual) =>
        atual.filter(
          (item) => item.id_produto !== livro.id_produto
        )
      );

      // Mensagem de sucesso dentro da interface
      setMensagemSucesso(
        dados.mensagem || "Coleção excluída com sucesso!"
      );

    } catch (erro) {
      console.error("Erro ao excluir coleção:", erro);

      Alert.alert(
        "Erro",
        erro.message || "Não foi possível conectar ao servidor."
      );
    }
  }

  // Aplicar filtros
  function handleAplicarFiltro({ titulo, autor, min, max }) {
    setFiltroTitulo(titulo);
    setFiltroAutor(autor);
    setPrecoMin(min);
    setPrecoMax(max);
  }

  function selecionarLinkRapido(label) {
    // Navegação dos links rápidos mantida conforme o Header.
  }

  return (
    <View style={acervoStyles.tela}>
      <Header
        navigation={navigation}
        busca={buscaBarra}
        setBusca={setBuscaBarra}
        onAbrirCategorias={() => setFiltroVisivel(true)}
        linksRapidos={LINKS_RAPIDOS}
        onSelecionarLink={selecionarLinkRapido}
      />

      {/* Mensagem de sucesso */}
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
        data={colecoesFiltradas}
        keyExtractor={(item) => String(item.id_produto)}
        contentContainerStyle={acervoStyles.scrollContent}

        ListHeaderComponent={
          <>
            <Text style={acervoStyles.tituloTopo}>
              Coleções e Boxes
            </Text>

            <Text
              style={{
                paddingHorizontal: 16,
                marginBottom: 20,
                color: CORES.muted || "#64748b",
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              Explore conjuntos de obras selecionadas, sagas completas e
              boxes exclusivos. Perfeito para quem deseja completar sua
              estante com edições especiais.
            </Text>

            <View style={acervoStyles.barraFiltro}>
              <Text style={acervoStyles.contadorTexto}>
                {colecoesFiltradas.length}{" "}
                {colecoesFiltradas.length === 1
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
            <ActivityIndicator size="large" color={CORES.dark} />
          ) : (
            <View style={acervoStyles.listaVazia}>
              <Text style={acervoStyles.listaVaziaTexto}>
                Nenhuma coleção encontrada com esses filtros.
              </Text>
            </View>
          )
        }

        ListFooterComponent={<Footer />}
      />

      <FiltroColecoesModal
        visible={filtroVisivel}
        onFechar={() => setFiltroVisivel(false)}
        tituloSalvo={filtroTitulo}
        autorSalvo={filtroAutor}
        precoMin={precoMin}
        precoMax={precoMax}
        onAplicar={handleAplicarFiltro}
      />
    </View>
  );
}