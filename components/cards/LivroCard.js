
import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { styles } from "../../styles/homeStyles";

function iniciais(titulo = "") {
  return titulo.split(" ").slice(0, 2).map((p) => p[0]).join("");
}

export default function LivroCard({ livro, onPress }) {
  const imagemUrl = livro.imagem_url || livro.imagem || null;

  return (
    <TouchableOpacity
      style={styles.livroCard}
      onPress={() => onPress(livro)}
      activeOpacity={0.85}
    >
      <View style={styles.livroImg}>
        {imagemUrl ? (
          <Image
            source={{ uri: imagemUrl }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 8,
            }}
            resizeMode="cover"
            onError={(erro) =>
              console.log(
                "Erro ao carregar capa na Home:",
                erro.nativeEvent
              )
            }
          />
        ) : (
          <Text style={styles.livroPlaceholder}>
            {iniciais(livro.titulo)}
          </Text>
        )}
      </View>

      <View style={styles.livroInfo}>
        <Text style={styles.livroNome} numberOfLines={2}>
          {livro.titulo}
        </Text>

        <Text style={styles.livroPreco}>
          R$ {Number(livro.preco).toFixed(2).replace(".", ",")}
        </Text>

        <Text style={styles.livroAutor} numberOfLines={1}>
          {livro.autor}
        </Text>
      </View>
    </TouchableOpacity>
  );
}