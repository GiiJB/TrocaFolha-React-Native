import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../components/global/Header";
import Footer from "../components/global/Footer";
import CategoriasModal from "../components/modals/CategoriasModal";
import { CORES } from "../constants/themes";
import { styles } from "../styles/carrinhoStyles";
import { CATEGORIAS, LINKS_RAPIDOS } from "../constants/Navbar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import API_URL from "../api";

function iniciais(titulo) {
  return titulo.split(" ").slice(0, 2).map((p) => p[0]).join("");
}

export default function TelaCarrinho({ navigation }) {


  const {
    itens,
    removerItem,
    alterarQuantidade,
    total,
  } = useCart();

  const { token } = useAuth();
  const [busca, setBusca] = useState("");
  const [modalCategoriasVisivel, setModalCategoriasVisivel] = useState(false);

  const quantidadeTotal = itens.reduce(
    (soma, item) => soma + item.quantidade,
    0
  );

  function selecionarCategoria(categoria) {
    setModalCategoriasVisivel(false);
  }

  function selecionarLinkRapido(label) {
    // Mesmos placeholders das outras telas
  }

  async function finalizarCompra() {
    if (!token) {
      Alert.alert(
        "Sessão expirada",
        "Faça login novamente para continuar."
      );
      return;
    }

    if (itens.length === 0) {
      Alert.alert(
        "Carrinho vazio",
        "Adicione pelo menos um livro antes de finalizar."
      );
      return;
    }

    try {
      const itensPedido = itens.map((item) => ({
        id: item.id,
        quantidade: item.quantidade,
      }));

      console.log("ITENS DO CARRINHO:", JSON.stringify(itens));
      console.log("ITENS ENVIADOS AO BACKEND:", JSON.stringify(itensPedido));

      const resposta = await fetch(`${API_URL}/api/pedidos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itens: itensPedido,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || dados.mensagem || "Não foi possível criar o pedido."
        );
      }

      const idPedido = dados.pedido?.id_pedido;

      if (!idPedido) {
        throw new Error("O número do pedido não foi recebido.");
      }

      const checkoutUrl = dados.pagamento?.checkout_url;

      if (!checkoutUrl) {
        throw new Error("O link de pagamento não foi recebido.");
      }

      await Linking.openURL(checkoutUrl);

      navigation.navigate("Pagamento", {
        idPedido: idPedido,
      });

    } catch (erro) {
      console.error("Erro ao finalizar compra:", erro);

      Alert.alert(
        "Erro ao finalizar compra",
        erro.message || "Tente novamente."
      );
    }
  }

  return (
    <View style={styles.tela}>
      <Header
        navigation={navigation}
        busca={busca}
        setBusca={setBusca}
        onAbrirCategorias={() => setModalCategoriasVisivel(true)}
        linksRapidos={LINKS_RAPIDOS}
        onSelecionarLink={selecionarLinkRapido}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.breadcrumb}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={16} color={CORES.muted} />
          <Text style={styles.breadcrumbTexto}>Continuar Comprando</Text>
        </TouchableOpacity>

        <Text style={styles.tituloPagina}>Meu Carrinho</Text>

        {itens.length === 0 ? (
          <View style={styles.vazioContainer}>
            <Text style={styles.vazioTexto}>
              Seu carrinho está vazio.
            </Text>
          </View>
        ) : (
          <>
            {itens.map((item) => (
              <View key={item.id} style={styles.cardItem}>
                <View style={styles.itemImagem}>
                  {item.imagem ? (
                    <Image
                      source={{ uri: item.imagem }}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 8,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.itemImagemTexto}>
                      {iniciais(item.titulo)}
                    </Text>
                  )}
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemCategoria}>
                    {item.categoria}
                  </Text>

                  <Text style={styles.itemTitulo} numberOfLines={2}>
                    {item.titulo}
                  </Text>

                  <Text style={styles.itemPreco}>
                    R$ {Number(item.preco).toFixed(2).replace(".", ",")}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                    <TouchableOpacity
                      onPress={() =>
                        alterarQuantidade(item.id, item.quantidade - 1)
                      }
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="remove-circle-outline" size={24} color={CORES.muted} />
                    </TouchableOpacity>

                    <Text style={{ marginHorizontal: 8 }}>
                      {item.quantidade}
                    </Text>

                    <TouchableOpacity
                      onPress={() =>
                        alterarQuantidade(item.id, item.quantidade + 1)
                      }
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="add-circle-outline" size={24} color={CORES.muted} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.removerBotao}
                    onPress={() => removerItem(item.id)}
                  >
                    <Text style={styles.removerTexto}>Remover item</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.resumoCard}>
              <Text style={styles.resumoTitulo}>Resumo</Text>

              <View style={styles.resumoLinha}>
                <Text style={styles.resumoLabel}>
                  Produtos ({quantidadeTotal})
                </Text>

                <Text style={styles.resumoValor}>
                  R$ {total.toFixed(2).replace(".", ",")}
                </Text>
              </View>

              <View style={styles.resumoLinha}>
                <Text style={styles.resumoLabel}>Frete</Text>
                <Text style={styles.freteValor}>Grátis</Text>
              </View>

              <View style={styles.divisor} />

              <View style={styles.totalLinha}>
                <Text style={styles.totalLabel}>Total</Text>

                <Text style={styles.totalValor}>
                  R$ {total.toFixed(2).replace(".", ",")}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.finalizarBotao}
                onPress={finalizarCompra}
              >
                <Text style={styles.finalizarTexto}>
                  Finalizar Compra
                </Text>
              </TouchableOpacity>

            </View>
          </>
        )}
      </ScrollView>

      <Footer />

      <CategoriasModal
        visible={modalCategoriasVisivel}
        onFechar={() => setModalCategoriasVisivel(false)}
        categorias={CATEGORIAS}
        onSelecionar={selecionarCategoria}
      />
    </View>
  );
}