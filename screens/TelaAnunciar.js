import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Header from "../components/global/Header";
import Footer from "../components/global/Footer";

import { CORES, FONTES } from "../constants/themes";
import { LINKS_RAPIDOS } from "../constants/Navbar";
import { styles as acervoStyles } from "../styles/acervoStyles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../api";


const CATEGORIAS = [
  "Literatura Brasileira", "Literatura Estrangeira", "Ficção", "Romance",
  "Poesia", "Terror", "Mistério & Suspense", "Infanto Juvenil",
  "Mangás", "Autoajuda", "Idiomas", "Desapega Uni"
];

const AREAS_ACADEMICAS = [
  "Direito", "Medicina", "Enfermagem", "Psicologia", "Engenharia",
  "Tecnologia", "Administração", "Economia", "Letras", "Pedagogia",
  "História", "Geografia", "Biologia", "Artes"
];

const CONSERVACAO = ["Ótimo estado", "Bom estado"];

export default function TelaAnunciar({ navigation, route }) {
  const [carregando, setCarregando] = useState(false);
  // Se vier um produto via rota, significa que estamos EDITANDO. Se não, estamos CRIANDO.
  const produtoEdicao = route.params?.produto || null;

  // ESTADOS DO FORMULÁRIO
  const [isColecao, setIsColecao] = useState(produtoEdicao?.colecao || false);
  const [imagemUri, setImagemUri] = useState(
    produtoEdicao?.imagem_url || produtoEdicao?.imagem || ""
  );

  const [titulo, setTitulo] = useState(produtoEdicao?.titulo || "");
  const [autor, setAutor] = useState(produtoEdicao?.autor || "");
  const [editora, setEditora] = useState(produtoEdicao?.editora || "");
  const [ano, setAno] = useState(produtoEdicao?.anoPublicacao ? String(produtoEdicao.anoPublicacao) : "");
  const [preco, setPreco] = useState(produtoEdicao?.preco ? String(produtoEdicao.preco) : "");
  const [conservacao, setConservacao] = useState(produtoEdicao?.conservacao || "");
  const [categoria, setCategoria] = useState(produtoEdicao?.categoria || "");
  const [area, setArea] = useState(produtoEdicao?.area || "");
  const [descricao, setDescricao] = useState(produtoEdicao?.descricao || "");

  // FUNÇÃO: Escolher imagem da galeria do celular


  async function escolherImagem() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (result.canceled) return;

      const imagemSelecionada = result.assets[0];
      const dadosImagem = new FormData();

      // No navegador, enviamos o arquivo real.
      // No Android, enviamos a URI da imagem.
      if (imagemSelecionada.file) {
        dadosImagem.append(
          "file",
          imagemSelecionada.file,
          imagemSelecionada.fileName || "capa-livro.jpg"
        );
      } else {
        dadosImagem.append("file", {
          uri: imagemSelecionada.uri,
          name: imagemSelecionada.fileName || "capa-livro.jpg",
          type: imagemSelecionada.mimeType || "image/jpeg",
        });
      }

      dadosImagem.append("upload_preset", "troca_folha");

      setEnviandoImagem(true);

      const resposta = await fetch(
        "https://api.cloudinary.com/v1_1/wrw cztpq/image/upload"
          .replace(" ", ""),
        {
          method: "POST",
          body: dadosImagem,
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.error?.message || "Não foi possível enviar a imagem."
        );
      }

      // Guardamos a URL da nuvem, não o caminho local.
      setImagemUri(dados.secure_url);

      Alert.alert("Sucesso!", "Imagem enviada para a nuvem!");
    } catch (erro) {
      console.error("Erro ao enviar imagem:", erro);

      Alert.alert(
        "Erro ao enviar imagem",
        erro.message || "Verifique sua conexão e tente novamente."
      );
    } finally {
      setEnviandoImagem(false);
    }
  }



  // FUNÇÃO: Mudar categoria (limpa a área se não for Desapega Uni)
  function handleCategoriaChange(cat) {
    setCategoria(cat);
    if (cat !== "Desapega Uni") {
      setArea(""); // Reseta a área acadêmica se trocar de categoria
    }
  }

  // FUNÇÃO: Validar e Enviar Formulário


  async function handleAnunciar() {
    if (carregando) return;

    if (!imagemUri) {
      Alert.alert("Atenção", "Selecione uma foto do produto.");
      return;
    }

    if (
      !titulo.trim() ||
      !autor.trim() ||
      !ano ||
      !preco ||
      !conservacao ||
      !categoria
    ) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios.");
      return;
    }

    if (categoria === "Desapega Uni" && !area) {
      Alert.alert("Atenção", "Selecione uma área acadêmica.");
      return;
    }

    const anoNumero = Number(ano);
    const precoNumero = Number(preco.replace(",", "."));

    if (!Number.isInteger(anoNumero) || anoNumero <= 0) {
      Alert.alert("Atenção", "Informe um ano válido.");
      return;
    }

    if (!Number.isFinite(precoNumero) || precoNumero < 0) {
      Alert.alert("Atenção", "Informe um preço válido.");
      return;
    }

    try {
      setCarregando(true);

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert(
          "Login necessário",
          "Entre na sua conta antes de anunciar um produto."
        );
        return;
      }

      const anuncioFormatado = {
        colecao: isColecao,
        imagem: imagemUri.trim(),
        titulo: titulo.trim(),
        autor: autor.trim(),
        editora: editora.trim(),
        anoPublicacao: anoNumero,
        preco: precoNumero,
        conservacao,
        categoria,
        area: categoria === "Desapega Uni" ? area : null,
        descricao: descricao.trim(),
      };

      const resposta = await fetch(
        produtoEdicao
          ? `${API_URL}/api/produtos/${produtoEdicao.id_produto}`
          : `${API_URL}/api/produtos`,
        {
          method: produtoEdicao ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(anuncioFormatado),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível cadastrar o produto."
        );
      }

      navigation.navigate("Acervo", {
        feedbackAcao: produtoEdicao
          ? "Anúncio atualizado com sucesso!"
          : "Anúncio cadastrado com sucesso!",
      });
    } catch (erro) {
      console.error("Erro ao anunciar:", erro);
      Alert.alert(
        "Erro ao anunciar",
        erro.message || "Não foi possível conectar ao servidor."
      );
    } finally {
      setCarregando(false);
    }
  }



  // Renderizador de Radios customizados (reaproveitando o estilo das bolinhas)
  const renderRadio = (label, selecionado, onPress) => (
    <TouchableOpacity style={styles.checkItem} onPress={onPress}>
      <View style={[styles.radioOuter, selecionado && styles.radioOuterAtivo]}>
        {selecionado && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.checkItemText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={acervoStyles.tela}>
      <Header navigation={navigation} busca="" setBusca={() => { }} linksRapidos={LINKS_RAPIDOS} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.tituloSecao}>
          {produtoEdicao ? "Edite seu produto." : "Cadastre seu produto."}
        </Text>

        <Text style={styles.textoIntro}>
          Preencha os campos abaixo para anunciar seu produto. É importante que todas as informações sejam verídicas.
        </Text>
        <Text style={styles.textoAviso}>
          <Text style={{ fontWeight: "bold" }}>Observação:</Text> A plataforma acrescenta o valor da taxa de serviço ao seu anúncio, sendo ela 10% do valor indicado por você.
        </Text>

        {/* ========== FOTO ========== */}

        <View style={styles.fotoContainer}>
          {imagemUri.trim() ? (
            <Image
              source={{ uri: imagemUri.trim() }}
              style={styles.fotoImagem}
              onError={() => console.log("Não foi possível carregar a imagem.")}
            />
          ) : (
            <View style={styles.fotoPlaceholderTexto}>
              <Ionicons name="image-outline" size={40} color="#94a3b8" />
              <Text style={styles.fotoTexto}>Prévia da imagem</Text>
              <Text style={styles.fotoTexto}>Cole um link abaixo</Text>
            </View>
          )}
        </View>

        <Text style={styles.fotoAvisoObrigatorio}>
          * Imagem obrigatória
        </Text>

        <Text style={styles.label}>Link da imagem *</Text>

        <TextInput
          style={styles.input}
          value={imagemUri}
          onChangeText={setImagemUri}
          placeholder="https://exemplo.com/imagem.jpg"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text style={styles.fotoAvisoObrigatorio}>* Upload de imagem obrigatório</Text>

        {/* ========== ABAS (TABS) ========== */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, !isColecao ? styles.tabAtiva : styles.tabInativa]}
            onPress={() => setIsColecao(false)}
          >
            <Text style={[styles.tabTexto, !isColecao && styles.tabTextoAtivo]}>Livro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, isColecao ? styles.tabAtiva : styles.tabInativa]}
            onPress={() => setIsColecao(true)}
          >
            <Text style={[styles.tabTexto, isColecao && styles.tabTextoAtivo]}>Coleção</Text>
          </TouchableOpacity>
        </View>

        {/* ========== FORMULÁRIO ========== */}
        <View style={styles.formContainer}>

          <Text style={styles.label}>{isColecao ? "Título da Coleção:*" : "Título:*"}</Text>
          <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder={isColecao ? "Ex: Box Harry Potter" : "Digite o título do livro"} />

          <Text style={styles.label}>Autor / Organizador:*</Text>
          <TextInput style={styles.input} value={autor} onChangeText={setAutor} placeholder="Digite o nome do(a) autor(a)" />

          <Text style={styles.label}>Editora:</Text>
          <TextInput style={styles.input} value={editora} onChangeText={setEditora} placeholder="Digite o nome da editora" />

          {/* Grid de 2 colunas para Ano e Preço */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Ano de publicação:*</Text>
              <TextInput style={styles.input} value={ano} onChangeText={setAno} keyboardType="numeric" placeholder="Ex: 2023" />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Valor (R$):*</Text>
              <TextInput style={styles.input} value={preco} onChangeText={setPreco} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
          </View>

          <Text style={styles.labelMargin}>Conservação do livro:*</Text>
          {CONSERVACAO.map((item) => renderRadio(item, conservacao === item, () => setConservacao(item)))}

          <Text style={styles.labelMargin}>Selecione a categoria:*</Text>
          <View style={styles.gridCategorias}>
            {CATEGORIAS.map((cat) => (
              <View key={cat} style={styles.gridItem}>
                {renderRadio(cat, categoria === cat, () => handleCategoriaChange(cat))}
              </View>
            ))}
          </View>

          {/* Áreas Acadêmicas (Opacidade controlada pelo pointerEvents) */}
          <View pointerEvents={categoria === "Desapega Uni" ? "auto" : "none"} style={{ opacity: categoria === "Desapega Uni" ? 1 : 0.3, marginTop: 20 }}>
            <Text style={styles.label}>Selecione a área acadêmica:*</Text>
            <View style={styles.gridCategorias}>
              {AREAS_ACADEMICAS.map((item) => (
                <View key={item} style={styles.gridItem}>
                  {renderRadio(item, area === item, () => setArea(item))}
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.labelMargin}>Descrição:</Text>
          <TextInput
            style={styles.textArea}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Detalhes extras sobre a edição, marcas de uso, etc..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />


          <TouchableOpacity
            style={styles.btnAnunciar}
            onPress={handleAnunciar}
            disabled={carregando}
          >
            <Text style={styles.btnAnunciarTexto}>
              {carregando
                ? "Enviando..."
                : produtoEdicao
                  ? "Salvar Alterações"
                  : "Anunciar Produto"}
            </Text>
          </TouchableOpacity>

        </View>

        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  tituloSecao: {
    fontFamily: FONTES.display,
    fontSize: 28,
    fontWeight: "700",
    color: CORES.dark,
    marginTop: 10,
    marginBottom: 10,
  },
  textoIntro: {
    fontSize: 14,
    color: CORES.dark,
    marginBottom: 8,
  },
  textoAviso: {
    fontSize: 14,
    color: CORES.dark,
    marginBottom: 20,
  },

  // Foto Placeholder
  fotoContainer: {
    height: 250,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fotoImagem: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  fotoPlaceholderTexto: {
    alignItems: "center",
  },
  fotoTexto: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 4,
  },
  btnFotoFooter: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: CORES.header || "#1e293b",
    paddingVertical: 12,
    alignItems: "center",
  },
  btnFotoFooterTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  fotoAvisoObrigatorio: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },

  // Abas (Tabs)
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 10, // Um pouco de recuo pra conectar suave com a caixa de baixo
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#000",
    borderBottomWidth: 0,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    alignItems: "center",
  },
  tabAtiva: {
    backgroundColor: "#fff",
    zIndex: 2, // Fica "por cima" visualmente
  },
  tabInativa: {
    backgroundColor: "#f1f5f9",
    marginTop: 4, // Abaixa a aba inativa um pouquinho
  },
  tabTexto: {
    fontFamily: FONTES.display,
    fontSize: 18,
    fontWeight: "700",
    color: "#94a3b8",
  },
  tabTextoAtivo: {
    color: CORES.dark,
  },

  // Formulário Container
  formContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 20,
    padding: 20,
    marginTop: -1, // Sobe 1px pra juntar as bordas com as abas
    zIndex: 1,
  },
  label: {
    fontWeight: "700",
    fontSize: 14,
    color: CORES.dark,
    marginBottom: 8,
  },
  labelMargin: {
    fontWeight: "700",
    fontSize: 14,
    color: CORES.dark,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 20,
    height: 44,
    paddingHorizontal: 14,
    marginBottom: 16,
    color: CORES.dark,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 100,
    marginBottom: 24,
    color: CORES.dark,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  col: {
    flex: 1,
  },

  // Checkboxes/Radios Customizados
  gridCategorias: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
  },
  gridItem: {
    width: "50%", // Divide em 2 colunas
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  checkItemText: {
    fontSize: 13,
    color: CORES.dark,
    flexShrink: 1,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: CORES.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterAtivo: {
    borderColor: CORES.accent,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: CORES.accent,
  },

  // Botão Final
  btnAnunciar: {
    backgroundColor: CORES.accent || "#f59e0b",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  btnAnunciarTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});