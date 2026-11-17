import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from "react-native";

import Header from "../components/global/Header";
import Footer from "../components/global/Footer";
import CategoriasModal from "../components/modals/CategoriasModal";

import { CORES, FONTES } from "../constants/themes";
import { CATEGORIAS, LINKS_RAPIDOS } from "../constants/Navbar";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import API_URL from "../api";

export default function TelaPagamento({ navigation, route }) {
    const idPedido = route?.params?.idPedido;
    const { token } = useAuth();
    const { limparCarrinho } = useCart();

    const [busca, setBusca] = useState("");
    const [modalCategoriasVisivel, setModalCategoriasVisivel] =
        useState(false);

    const [carregando, setCarregando] = useState(false);
    const [statusPagamento, setStatusPagamento] =
        useState("aguardando_pagamento");
    const [mensagemErro, setMensagemErro] = useState("");

    function selecionarCategoria(categoria) {
        setModalCategoriasVisivel(false);

        if (categoria === "Desapega Uni") {
            navigation.navigate("Desapega");
        } else {
            navigation.navigate("Acervo", { categoria });
        }
    }

    async function verificarPagamento() {
        if (!token) {
            setMensagemErro("Sua sessão expirou. Faça login novamente.");
            return;
        }

        if (!idPedido) {
            setMensagemErro("Não foi possível identificar o pedido.");
            return;
        }

        try {
            setCarregando(true);
            setMensagemErro("");

            const resposta = await fetch(
                `${API_URL}/api/pedidos/${idPedido}/status`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.erro ||
                    dados.mensagem ||
                    "Não foi possível consultar o pagamento."
                );
            }

            setStatusPagamento(dados.status_pagamento);

            if (
                dados.status_pagamento === "aprovado" &&
                dados.status_pedido === "pago"
            ) {
                limparCarrinho();

                navigation.replace("Final", { idPedido });
            }

        } catch (erro) {
            console.error("Erro ao verificar pagamento:", erro);
            setMensagemErro(
                erro.message || "Não foi possível consultar o pagamento."
            );
        } finally {
            setCarregando(false);
        }
    }

    const pagamentoPendente = [
        "aguardando_pagamento",
        "pendente",
        "in_process",
        "authorized",
    ].includes(statusPagamento);

    const informacoesPagamento = {
        recusado: {
            emoji: "❌",
            titulo: "Pagamento recusado",
            descricao:
                "O Mercado Pago não autorizou o pagamento. Você pode tentar novamente com outra forma de pagamento.",
        },
        cancelado: {
            emoji: "🚫",
            titulo: "Pagamento cancelado",
            descricao:
                "O pagamento foi cancelado e o pedido não foi concluído. Seus livros continuam no carrinho caso queira tentar novamente.",
        },
        estornado: {
            emoji: "↩️",
            titulo: "Pagamento estornado",
            descricao:
                "O pagamento foi estornado. Consulte as informações da transação no Mercado Pago.",
        },
    };

    const informacaoAtual = pagamentoPendente
        ? {
            emoji: "⏳",
            titulo: "Aguardando pagamento",
            descricao:
                "Estamos aguardando a confirmação do Mercado Pago. Você pode consultar novamente o status do seu pedido.",
        }
        : informacoesPagamento[statusPagamento] || {
            emoji: "⚠️",
            titulo: "Pagamento não confirmado",
            descricao:
                "Não foi possível confirmar seu pagamento. Verifique novamente o status ou consulte as informações no Mercado Pago.",
        };

    return (
        <View style={styles.tela}>
            <Header
                navigation={navigation}
                busca={busca}
                setBusca={setBusca}
                onAbrirCategorias={() => setModalCategoriasVisivel(true)}
                linksRapidos={LINKS_RAPIDOS}
            />

            <View style={styles.conteudoCentral}>
                <View style={styles.cardPagamento}>
                    <Text style={styles.emoji}>
                        {informacaoAtual.emoji}
                    </Text>

                    <Text style={styles.titulo}>
                        {informacaoAtual.titulo}
                    </Text>

                    <Text style={styles.subtitulo}>
                        Pedido #{idPedido}
                    </Text>

                    <Text style={styles.descricao}>
                        {informacaoAtual.descricao}
                    </Text>

                    <View style={styles.statusContainer}>
                        <Text style={styles.statusTexto}>
                            Status: {statusPagamento}
                        </Text>
                    </View>

                    {mensagemErro !== "" && (
                        <Text style={styles.erroTexto}>
                            {mensagemErro}
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.botaoVerificar,
                            carregando && styles.botaoDesabilitado,
                        ]}
                        onPress={verificarPagamento}
                        disabled={carregando}
                    >
                        <Text style={styles.botaoVerificarTexto}>
                            {carregando
                                ? "Consultando..."
                                : "Verificar novamente"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.botaoHome}
                        onPress={() => navigation.navigate("Home")}
                    >
                        <Text style={styles.botaoHomeTexto}>
                            Voltar para a Home
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

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

const styles = StyleSheet.create({
    tela: {
        flex: 1,
        backgroundColor: CORES.bg || "#f8fafc",
    },

    conteudoCentral: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        minHeight: "60vh",
    },

    cardPagamento: {
        backgroundColor: "#fffbeb",
        borderWidth: 1,
        borderColor: "#fde68a",
        padding: 30,
        borderRadius: 16,
        width: "100%",
        maxWidth: 450,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },

    emoji: {
        fontSize: 48,
        marginBottom: 10,
    },

    titulo: {
        fontFamily: FONTES.display,
        color: "#92400e",
        fontSize: 25,
        fontWeight: "700",
        marginBottom: 6,
        textAlign: "center",
    },

    subtitulo: {
        color: "#b45309",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 20,
        textAlign: "center",
    },

    descricao: {
        color: "#64748b",
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
        marginBottom: 20,
    },

    statusContainer: {
        backgroundColor: "#fef3c7",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 20,
    },

    statusTexto: {
        color: "#92400e",
        fontWeight: "700",
        fontSize: 13,
    },

    erroTexto: {
        color: "#dc2626",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 15,
    },

    botaoVerificar: {
        backgroundColor: "#166534",
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: "center",
        width: "100%",
        marginBottom: 12,
    },

    botaoVerificarTexto: {
        color: "#ffffff",
        fontFamily: FONTES.body,
        fontWeight: "700",
        fontSize: 15,
    },

    botaoDesabilitado: {
        opacity: 0.6,
    },

    botaoHome: {
        backgroundColor: "#1e293b",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: "center",
        width: "100%",
    },

    botaoHomeTexto: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 15,
    },
});