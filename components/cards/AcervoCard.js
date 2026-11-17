import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { styles } from "../../styles/acervoStyles";

export default function AcervoCard({ livro, usuarioLogado, onPress, onAdicionar, onEditar, onApagar }) {
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);

  // Dono pode gerenciar o próprio anúncio.
  // Administrador pode gerenciar qualquer anúncio.
  const podeGerenciar =
    !!usuarioLogado &&
    (
      Number(usuarioLogado.is_admin) === 1 ||
      (
        livro.dono != null &&
        Number(livro.dono.id_usuario) ===
          Number(usuarioLogado.id_usuario)
      )
    );

  function confirmarApagar() {
    setConfirmandoApagar(true);
  }

  function cancelarApagar() {
    setConfirmandoApagar(false);
  }

  async function executarExclusao() {
    setConfirmandoApagar(false);
    await onApagar(livro);
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(livro)}
      activeOpacity={0.85}
    >
      <View style={styles.cardImg}>
        {livro.imagem ? (
          <Image
            source={{ uri: livro.imagem }}
            style={styles.cardImgFoto}
            resizeMode="cover"
            onError={(erro) =>
              console.log(
                "Erro ao carregar imagem:",
                erro.nativeEvent
              )
            }
          />
        ) : (
          <Text style={styles.semFoto}>SEM FOTO</Text>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardTag}>
          Acervo - {livro.categoria}
        </Text>

        <Text style={styles.cardTitulo} numberOfLines={2}>
          {livro.titulo}
        </Text>

        <Text style={styles.cardPreco}>
          R$ {livro.preco.toFixed(2).replace(".", ",")}
        </Text>

        <Text style={styles.cardDetalhe} numberOfLines={1}>
          Autor: {livro.autor}
        </Text>

        <View style={styles.cardAcoes}>
          <TouchableOpacity
            style={styles.btnAdicionar}
            onPress={() => onAdicionar(livro)}
          >
            <Text style={styles.btnAdicionarTexto}>
              🛒 Adicionar
            </Text>
          </TouchableOpacity>

          {podeGerenciar && (
            <>
              <TouchableOpacity
                style={styles.btnEditar}
                onPress={() => onEditar(livro)}
              >
                <Text style={styles.btnEditarTexto}>
                  Editar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnApagar}
                onPress={confirmarApagar}
              >
                <Text style={styles.btnApagarTexto}>
                  Apagar
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {confirmandoApagar && (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              backgroundColor: "#fee2e2",
              borderRadius: 8,
              width: "100%",
            }}
          >
            <Text
              style={{
                color: "#991b1b",
                marginBottom: 10,
              }}
            >
              Tem certeza que deseja apagar "{livro.titulo}"?
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <TouchableOpacity
                onPress={executarExclusao}
                style={{
                  backgroundColor: "#b91c1c",
                  padding: 8,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                >
                  Confirmar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={cancelarApagar}
                style={{
                  backgroundColor: "#e5e7eb",
                  padding: 8,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "#374151" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}