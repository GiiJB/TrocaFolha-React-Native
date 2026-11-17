import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Alert } from "react-native";

import Header from "../components/global/Header";
import Footer from "../components/global/Footer";
import CategoriasModal from "../components/modals/CategoriasModal";
import { useAuth } from "../context/AuthContext";
import { CORES } from "../constants/themes";
import { styles } from "../styles/authStyles";
import { CATEGORIAS, LINKS_RAPIDOS } from "../constants/Navbar";
import API_URL from "../api";

export default function TelaMinhaConta({ navigation }) {

  const { token, usuarioLogado } = useAuth();

  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalCategoriasVisivel, setModalCategoriasVisivel] =
    useState(false);

  useEffect(() => {
    async function carregarUsuario() {
      try {
        const resposta = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados.erro || "Não foi possível carregar seus dados."
          );
        }

        setUsuario(dados.usuario);
      } catch (erro) {
        console.error("Erro ao carregar conta:", erro);
        Alert.alert("Erro", erro.message);
      } finally {
        setCarregando(false);
      }
    }

    if (token) {
      carregarUsuario();
    } else {
      setCarregando(false);
    }
  }, [token]);

  function selecionarCategoria(categoria) {
    setModalCategoriasVisivel(false);
    navigation.navigate("Acervo", { categoria });
  }

  function exibirCampo(rotulo, valor) {
    return (
      <View
        style={{
          marginBottom: 18,
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
          paddingBottom: 12,
        }}
      >
        <Text style={{ color: "#64748b", fontSize: 13 }}>
          {rotulo}
        </Text>

        <Text
          style={{
            color: "#1e293b",
            fontSize: 16,
            marginTop: 5,
            fontWeight: "500",
          }}
        >
          {valor || "Não informado"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tela}>
      <Header
        navigation={navigation}
        busca={busca}
        setBusca={setBusca}
        onAbrirCategorias={() => setModalCategoriasVisivel(true)}
        linksRapidos={LINKS_RAPIDOS}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.titulo}>Minha conta</Text>

          <Text style={styles.subtitulo}>
            Consulte seus dados cadastrais.
          </Text>

          {carregando ? (
            <ActivityIndicator
              size="large"
              color={CORES.header}
              style={{ marginVertical: 30 }}
            />
          ) : usuario ? (
            <>
              {exibirCampo("Nome completo", usuario.nome)}
              {exibirCampo("E-mail", usuario.email)}
              {exibirCampo("Telefone", usuario.telefone)}
              {exibirCampo("Cidade", usuario.cidade)}
              {exibirCampo("Estado", usuario.estado)}
            </>
          ) : (
            <Text>
              Não foi possível carregar os dados da sua conta.
            </Text>
          )}
        </View>
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