import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import Header from "../components/global/Header";
import CategoriasModal from "../components/modals/CategoriasModal";
import Footer from "../components/global/Footer";
import Campo from "../components/ui/Campo";
import Alerta from "../components/ui/Alert";
import Botao from "../components/ui/Button";
import { styles } from "../styles/authStyles";
import { CATEGORIAS, LINKS_RAPIDOS } from "../constants/Navbar";
import { useAuth } from "../context/AuthContext";
import API_URL from "../api";


export default function TelaLogin({ navigation }) {
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState("");
  const [modalCategoriasVisivel, setModalCategoriasVisivel] = useState(false);
  const { login } = useAuth();

  function selecionarCategoria(categoria) {
    setModalCategoriasVisivel(false);
    // Tela "Acervo" ainda não existe:
    // navigation.navigate('Acervo', { categoria })
  }

  function selecionarLinkRapido(label) {
    // Cada um desses vai virar uma navegação quando as telas existirem:
    // "Explorar Acervo" -> Acervo | "Coleções" -> Colecoes
    // "Desapega Uni" -> Desapega | "Anuncie seu livro!" -> Anunciar
    // "Precisa de ajuda?" -> Ajuda
  }



  async function handleEntrar() {
    setMensagemErro("");
    setMensagemSucesso("");

    if (!email.trim() || !senha) {
      setMensagemErro("Informe seu e-mail e sua senha.");
      return;
    }

    try {
      setCarregando(true);

      const resposta = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          senha,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível realizar o login."
        );
      }

      if (!dados.token) {
        throw new Error("O servidor não retornou o token de acesso.");
      }

      await login(dados.usuario, dados.token);

      navigation.replace("Home", {
        feedbackLogin: "Login realizado com sucesso!",
      });
    } catch (erro) {
      console.error("Erro no login:", erro);
      setMensagemErro(
        erro.message || "Não foi possível conectar ao servidor."
      );
    } finally {
      setCarregando(false);
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.tabs}>
            <View style={[styles.tab, styles.tabAtiva]}>
              <Text style={[styles.tabTexto, styles.tabTextoAtivo]}>Login</Text>
            </View>
            <TouchableOpacity style={styles.tab} onPress={() => navigation.replace("Cadastro")}>
              <Text style={styles.tabTexto}>Cadastro</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.titulo}>Bem-vindo de volta!</Text>
          {mensagemSucesso !== "" && (
            <View
              style={{
                backgroundColor: "#dcfce7",
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#166534" }}>{mensagemSucesso}</Text>
            </View>
          )}

          {mensagemErro !== "" && (
            <View
              style={{
                backgroundColor: "#fee2e2",
                padding: 12,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#991b1b" }}>{mensagemErro}</Text>
            </View>
          )}

          <Campo
            label="E-mail"
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Campo
            label="Senha"
            placeholder="Digite sua senha"
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />

          <Botao onPress={handleEntrar} disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar na conta"}
          </Botao>
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