import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { CORES } from "../../constants/themes";
import { styles } from "../../styles/homeStyles";
import { useAuth } from "../../context/AuthContext";

export default function Header({
  navigation,
  busca,
  setBusca,
  onAbrirCategorias,
  linksRapidos = [],
}) {
  const { usuarioLogado, logout } = useAuth();

  const [menuUsuarioVisivel, setMenuUsuarioVisivel] = useState(false);

  function handleNavegacao(label) {
    if (label.includes("Acervo")) {
      navigation.navigate("Acervo");
    } else if (
      label.includes("Coleções") ||
      label.includes("Colecoes")
    ) {
      navigation.navigate("Colecoes");
    } else if (label.includes("Desapega")) {
      navigation.navigate("Desapega");
    } else if (
      label.includes("Anuncie") ||
      label.includes("Anunciar")
    ) {
      navigation.navigate("Anunciar");
    }
  }

  async function handleSair() {
    try {
      await logout();

      setMenuUsuarioVisivel(false);

      navigation.replace("Login");
    } catch (erro) {
      console.error("Erro ao sair da conta:", erro);

      Alert.alert(
        "Erro",
        "Não foi possível sair da conta."
      );
    }
  }

  return (
    <View style={styles.header}>
      <View style={styles.headerTopo}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.logoTexto}>
            Sebo Digital
          </Text>
        </TouchableOpacity>

        <View style={styles.headerAcoes}>
          <TouchableOpacity
            style={styles.acaoItem}
            onPress={() => navigation.navigate("Carrinho")}
          >
            <Ionicons
              name="cart-outline"
              size={24}
              color={CORES.white}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acaoItem}
            onPress={() => {
              if (usuarioLogado) {
                setMenuUsuarioVisivel(!menuUsuarioVisivel);
              } else {
                navigation.navigate("Login");
              }
            }}
          >
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={CORES.white}
            />
          </TouchableOpacity>
        </View>
      </View>

      {usuarioLogado && menuUsuarioVisivel && (
        <View
          style={{
            position: "absolute",
            right: 12,
            top: 55,
            backgroundColor: "#ffffff",
            padding: 14,
            borderRadius: 8,
            zIndex: 999,
            elevation: 5,
            minWidth: 140,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setMenuUsuarioVisivel(false);
              navigation.navigate("MinhaConta");
            }}
          >
            <Text
              style={{
                color: "#1e293b",
                marginBottom: 10,
                fontWeight: "bold",
              }}
            >
              Minha conta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSair}>
            <Text style={{ color: "#dc2626" }}>
              Sair da conta
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buscaWrap}>
        <Ionicons
          name="search"
          size={18}
          color={CORES.muted}
          style={styles.buscaIcone}
        />

        <TextInput
          style={styles.buscaInput}
          placeholder="Busque por títulos, autores ou palavras-chave"
          placeholderTextColor="#94a3b8"
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <View style={styles.menuLinha}>
        <TouchableOpacity
          style={styles.categoriasBotao}
          onPress={onAbrirCategorias}
        >
          <Ionicons
            name="menu"
            size={18}
            color={CORES.header}
          />

          <Text style={styles.categoriasBotaoTexto}>
            Categorias
          </Text>

          <Ionicons
            name="chevron-down"
            size={16}
            color={CORES.header}
          />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsScrollConteudo}
        >
          {linksRapidos.map((link) => (
            <TouchableOpacity
              key={link.label}
              style={styles.chipCategoria}
              onPress={() => handleNavegacao(link.label)}
            >
              <Ionicons
                name={link.icone}
                size={14}
                color={CORES.white}
              />

              <Text style={styles.chipCategoriaTexto}>
                {link.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}