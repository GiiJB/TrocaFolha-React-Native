import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../components/global/Header";
import CategoriasModal from "../components/modals/CategoriasModal";
import Footer from "../components/global/Footer";
import Campo from "../components/ui/Campo";
import Alerta from "../components/ui/Alert";
import Botao from "../components/ui/Button";
import { CORES } from "../constants/themes";
import { styles } from "../styles/authStyles";
import { CATEGORIAS, LINKS_RAPIDOS } from "../constants/Navbar";
import API_URL from "../api";

const ESTADOS = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "MG", nome: "Minas Gerais" },
];

export default function TelaCadastro({ navigation }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  const [senhaCurta, setSenhaCurta] = useState(false);
  const [senhasDiferentes, setSenhasDiferentes] = useState(false);
  const [busca, setBusca] = useState("");
  const [modalCategoriasVisivel, setModalCategoriasVisivel] = useState(false);

  function selecionarCategoria(categoria) {
    setModalCategoriasVisivel(false);
  }

  function selecionarLinkRapido(label) {
  }

  async function handleCadastrar() {
    setSenhaCurta(false);
    setSenhasDiferentes(false);
    setMensagemSucesso("");
    setMensagemErro("");

    if (
      !nome.trim() ||
      !email.trim() ||
      !senha ||
      !confirma ||
      !telefone.trim() ||
      !dataNascimento.trim() ||
      !estado ||
      !cidade.trim()
    ) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios.");
      return;
    }

    if (!aceitouTermos) {
      Alert.alert("Atenção", "Você precisa aceitar os termos de uso e privacidade.");
      return;
    }

    if (senha.length < 6) {
      setSenhaCurta(true);
      return;
    }

    if (senha !== confirma) {
      setSenhasDiferentes(true);
      return;
    }

    try {
      const resposta = await fetch(`${API_URL}/api/auth/cadastro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha,
          telefone: telefone.trim(),
          dataNascimento: dataNascimento.trim(),
          estado,
          cidade: cidade.trim(),
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível realizar o cadastro.");
      }

      setMensagemSucesso("Cadastro realizado com sucesso! Sua conta foi criada.");

    } catch (erro) {
      console.error("Erro no cadastro:", erro);
      setMensagemErro(
        erro.message || "Não foi possível conectar ao servidor."
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity style={styles.tab} onPress={() => navigation.replace("Login")}>
              <Text style={styles.tabTexto}>Login</Text>
            </TouchableOpacity>
            <View style={[styles.tab, styles.tabAtiva]}>
              <Text style={[styles.tabTexto, styles.tabTextoAtivo]}>Cadastro</Text>
            </View>
          </View>

          <Text style={styles.titulo}>Crie sua conta</Text>
          <Text style={styles.subtitulo}>Junte-se à nossa comunidade de leitores.</Text>
          {mensagemSucesso !== "" && (
            <View style={{ backgroundColor: "#dcfce7", padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <Text style={{ color: "#166534" }}>{mensagemSucesso}</Text>

              <TouchableOpacity
                onPress={() => navigation.replace("Login")}
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: "#166534", fontWeight: "bold" }}>
                  Ir para o login
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {mensagemErro !== "" && (
            <View style={{ backgroundColor: "#fee2e2", padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <Text style={{ color: "#991b1b" }}>{mensagemErro}</Text>
            </View>
          )}


          {senhaCurta && <Alerta tipo="erro">A senha deve ter no mínimo 6 dígitos.</Alerta>}
          {senhasDiferentes && <Alerta tipo="erro">As senhas não coincidem!</Alerta>}

          <Campo label="Nome completo*" placeholder="Seu nome" value={nome} onChangeText={setNome} />
          <Campo
            label="E-mail*"
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Campo
            label="Senha*"
            placeholder="Mínimo 6 dígitos"
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />
          <Campo
            label="Confirme a senha*"
            placeholder="Repita a senha"
            secureTextEntry
            value={confirma}
            onChangeText={setConfirma}
          />
          <Campo
            label="Telefone*"
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
            value={telefone}
            onChangeText={setTelefone}
          />
          <Campo
            label="Data de nascimento*"
            placeholder="DD/MM/AAAA"
            value={dataNascimento}
            onChangeText={setDataNascimento}
          />

          {
          }
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Estado onde reside*</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ESTADOS.map((e) => (
                <TouchableOpacity
                  key={e.sigla}
                  style={[styles.chip, estado === e.sigla && styles.chipAtivo]}
                  onPress={() => setEstado(e.sigla)}
                >
                  <Text style={[styles.chipTexto, estado === e.sigla && styles.chipTextoAtivo]}>
                    {e.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Campo label="Cidade*" placeholder="Sua cidade" value={cidade} onChangeText={setCidade} />

          <TouchableOpacity
            style={styles.checkboxLinha}
            onPress={() => setAceitouTermos(!aceitouTermos)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, aceitouTermos && styles.checkboxMarcado]}>
              {aceitouTermos && <Ionicons name="checkmark" size={14} color={CORES.white} />}
            </View>
            <Text style={styles.checkboxTexto}>Aceito os termos de uso e privacidade</Text>
          </TouchableOpacity>

          <Botao onPress={handleCadastrar}>Finalizar cadastro</Botao>
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