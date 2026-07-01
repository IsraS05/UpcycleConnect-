# Makefile — UpcycleConnect API Go
# Usage : make <commande>

BINARY  = upcycleconnect
GOFILES = $(shell find . -name "*.go" -not -path "./vendor/*")
PORT    = 8080

.PHONY: all build run test test-login test-dashboard test-projects \
        test-scanner test-profile lint fmt clean help

# ─── Défaut ───────────────────────────────
all: build

# ─── Build ────────────────────────────────
build:
	@echo "▶ Build $(BINARY)..."
	@go build -o $(BINARY) ./...
	@echo "✓ Build OK → ./$(BINARY)"

# ─── Démarrage ────────────────────────────
run:
	@echo "▶ Démarrage API sur :$(PORT)..."
	@JWT_SECRET=$${JWT_SECRET:-dev_secret_change_me} \
	 go run main_pro.go

# Démarrage avec rechargement automatique (nécessite : go install github.com/air-verse/air@latest)
dev:
	@which air > /dev/null 2>&1 && air || (echo "air non installé — go run à la place" && make run)

# ─── Tests curl ───────────────────────────
test:
	@chmod +x test_api.sh
	@./test_api.sh all

test-login:
	@chmod +x test_api.sh && ./test_api.sh login

test-dashboard:
	@chmod +x test_api.sh && ./test_api.sh dashboard

test-subscription:
	@chmod +x test_api.sh && ./test_api.sh subscription

test-billing:
	@chmod +x test_api.sh && ./test_api.sh billing

test-marketplace:
	@chmod +x test_api.sh && ./test_api.sh marketplace

test-containers:
	@chmod +x test_api.sh && ./test_api.sh containers

test-scanner:
	@chmod +x test_api.sh && ./test_api.sh scanner

test-projects:
	@chmod +x test_api.sh && ./test_api.sh projects

test-profile:
	@chmod +x test_api.sh && ./test_api.sh profile

# ─── Qualité ──────────────────────────────
lint:
	@which golangci-lint > /dev/null 2>&1 \
		&& golangci-lint run ./... \
		|| go vet ./...

fmt:
	@gofmt -w $(GOFILES)
	@echo "✓ Code formaté"

# Vérifier que la BDD est accessible
check-db:
	@mysql -u root -e "USE pa2026; SELECT COUNT(*) as nb_tables FROM information_schema.tables WHERE table_schema='pa2026';" 2>/dev/null \
		&& echo "✓ BDD pa2026 accessible" \
		|| echo "✗ BDD inaccessible — vérifie MySQL"

# Appliquer la migration v2
migrate:
	@echo "▶ Application migration v2..."
	@mysql -u root pa2026 < migration_v2.sql \
		&& echo "✓ Migration v2 appliquée" \
		|| echo "✗ Erreur migration"

# ─── Dépendances ──────────────────────────
deps:
	@echo "▶ Installation dépendances..."
	go mod tidy
	go get github.com/golang-jwt/jwt/v5
	go get golang.org/x/crypto/bcrypt
	go get github.com/go-sql-driver/mysql
	@echo "✓ Dépendances installées"

# ─── Nettoyage ────────────────────────────
clean:
	@rm -f $(BINARY)
	@echo "✓ Nettoyé"

# ─── Aide ─────────────────────────────────
help:
	@echo ""
	@echo "  UpcycleConnect API Go — Commandes disponibles"
	@echo "  ─────────────────────────────────────────────"
	@echo "  make build          Compiler le binaire"
	@echo "  make run            Démarrer l'API (port 8080)"
	@echo "  make dev            Démarrer avec hot-reload (air)"
	@echo "  make test           Lancer tous les tests curl"
	@echo "  make test-login     Tester uniquement l'auth"
	@echo "  make test-dashboard Tester le dashboard"
	@echo "  make test-projects  Tester les projets"
	@echo "  make migrate        Appliquer migration_v2.sql"
	@echo "  make check-db       Vérifier la connexion BDD"
	@echo "  make deps           Installer les dépendances Go"
	@echo "  make fmt            Formater le code"
	@echo "  make lint           Linter le code"
	@echo "  make clean          Supprimer le binaire"
	@echo ""
