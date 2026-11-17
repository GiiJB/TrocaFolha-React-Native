CREATE DATABASE IF NOT EXISTS troca_folha
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE troca_folha;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  data_nascimento DATE NULL,
  estado CHAR(2),
  cidade VARCHAR(100),
  tipo_usuario ENUM('comprador','vendedor','ambos') NOT NULL DEFAULT 'ambos',
  data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS livros (
  id_livro INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  autor VARCHAR(150) NOT NULL,
  genero VARCHAR(100),
  editora VARCHAR(120),
  ano_publicacao SMALLINT UNSIGNED,
  descricao TEXT,
  imagem_url TEXT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS anuncios (
  id_anuncio INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NULL,
  id_livro INT UNSIGNED NOT NULL,
  titulo_anuncio VARCHAR(200),
  preco DECIMAL(10,2) NOT NULL,
  status ENUM('ativo','inativo','vendido') NOT NULL DEFAULT 'ativo',
  categoria VARCHAR(100),
  area VARCHAR(100),
  conservacao VARCHAR(40),
  colecao BOOLEAN NOT NULL DEFAULT FALSE,
  data_publicacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_anuncio_preco CHECK (preco >= 0),
  CONSTRAINT fk_anuncio_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_anuncio_livro FOREIGN KEY (id_livro)
    REFERENCES livros(id_livro) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_anuncios_status (status),
  INDEX idx_anuncios_categoria (categoria)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS carrinhos (
  id_carrinho INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NOT NULL,
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('ativo','finalizado') NOT NULL DEFAULT 'ativo',
  CONSTRAINT fk_carrinho_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS itens_carrinho (
  id_item INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_carrinho INT UNSIGNED NOT NULL,
  id_anuncio INT UNSIGNED NOT NULL,
  quantidade INT UNSIGNED NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  CONSTRAINT chk_item_carrinho_qtd CHECK (quantidade > 0),
  CONSTRAINT chk_item_carrinho_preco CHECK (preco_unitario >= 0),
  CONSTRAINT fk_item_carrinho_carrinho FOREIGN KEY (id_carrinho)
    REFERENCES carrinhos(id_carrinho) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_item_carrinho_anuncio FOREIGN KEY (id_anuncio)
    REFERENCES anuncios(id_anuncio) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY uk_carrinho_anuncio (id_carrinho, id_anuncio)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedidos (
  id_pedido INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT UNSIGNED NOT NULL,
  data_pedido TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('aguardando_pagamento','pago','enviado','entregue','cancelado')
    NOT NULL DEFAULT 'aguardando_pagamento',
  valor_total DECIMAL(10,2) NOT NULL,
  CONSTRAINT chk_pedido_valor CHECK (valor_total >= 0),
  CONSTRAINT fk_pedido_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS itens_pedido (
  id_item_pedido INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT UNSIGNED NOT NULL,
  id_anuncio INT UNSIGNED NOT NULL,
  quantidade INT UNSIGNED NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  CONSTRAINT chk_item_pedido_qtd CHECK (quantidade > 0),
  CONSTRAINT chk_item_pedido_preco CHECK (preco_unitario >= 0),
  CONSTRAINT fk_item_pedido_pedido FOREIGN KEY (id_pedido)
    REFERENCES pedidos(id_pedido) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_item_pedido_anuncio FOREIGN KEY (id_anuncio)
    REFERENCES anuncios(id_anuncio) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pagamentos (
  id_pagamento INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT UNSIGNED NOT NULL,
  provedor ENUM('mercado_pago') NOT NULL DEFAULT 'mercado_pago',
  metodo ENUM('pix','cartao','outro') NOT NULL DEFAULT 'outro',
  valor DECIMAL(10,2) NOT NULL,
  status ENUM('pendente','aprovado','recusado','cancelado','estornado')
    NOT NULL DEFAULT 'pendente',
  mp_payment_id VARCHAR(100) UNIQUE,
  mp_preference_id VARCHAR(100),
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_pagamento DATETIME NULL,
  CONSTRAINT chk_pagamento_valor CHECK (valor >= 0),
  CONSTRAINT fk_pagamento_pedido FOREIGN KEY (id_pedido)
    REFERENCES pedidos(id_pedido) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pagamento_notificacoes (
  id_notificacao INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pagamento INT UNSIGNED NULL,
  mp_event_id VARCHAR(100) NOT NULL UNIQUE,
  tipo_evento VARCHAR(100) NOT NULL,
  data_recebimento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processada BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_notificacao_pagamento FOREIGN KEY (id_pagamento)
    REFERENCES pagamentos(id_pagamento) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS entregas (
  id_entrega INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT UNSIGNED NOT NULL UNIQUE,
  endereco_destino VARCHAR(500) NOT NULL,
  frete DECIMAL(10,2) NOT NULL DEFAULT 0,
  data_envio DATETIME NULL,
  data_prevista DATE NULL,
  status ENUM('preparando','enviado','entregue','cancelado') NOT NULL DEFAULT 'preparando',
  codigo_rastreio VARCHAR(100),
  CONSTRAINT chk_entrega_frete CHECK (frete >= 0),
  CONSTRAINT fk_entrega_pedido FOREIGN KEY (id_pedido)
    REFERENCES pedidos(id_pedido) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
