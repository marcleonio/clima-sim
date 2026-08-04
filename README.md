# 🌍 Painel ClimaBrasil — Engine de Simulação de Resposta Climática

O **Painel ClimaBrasil** é uma plataforma de inteligência analítica e simulação de cenários projetada para auxiliar gestores públicos na tomada de decisão focada em resiliência e maturidade climática. 

A aplicação utiliza um modelo econométrico de **Regressão Linear Múltipla (OLS)** integrado a uma **Matriz de Interdependência Bidirecional** e **Trade-offs Operacionais**, permitindo projetar o impacto de decisões orçamentárias e institucionais ao longo de um mandato de 4 anos.

---

## 🚀 Tecnologias Utilizadas

### **Backend**
* **Java 21** / **Spring Boot 3**
* **Apache Commons Math 3** (Processamento e treinamento do modelo OLS)
* **Lombok** & **Slf4j**
* **Maven**

### **Frontend**
* **Next.js 16** (React 19)
* **Tailwind CSS v4** & **Shadcn UI**
* **Recharts** (Visualização gráfica de séries temporais)
* **SWR** (Data fetching e revalidação de estado)
* **pnpm** (Gerenciador de pacotes)

### **Infraestrutura**
* **Docker** & **Docker Compose**

---

## 🧠 Arquitetura do Motor de Simulação (`RegressionEngineService`)

O coração do backend é o serviço de simulação, que combina ciência de dados e regras de gestão pública realistas:

### 1. Treinamento OLS (Ordinary Least Squares)
No startup da aplicação (`@PostConstruct`), o serviço carrega a base agregada e treina uma regressão múltipla para prever o impacto da captação de recursos e da governança na execução de políticas públicas:
$$\text{Políticas Públicas} = \beta_0 + \beta_1 \cdot \text{Financiamento} + \beta_2 \cdot \text{Governança}$$

### 2. Matriz de Interdependência Bidirecional
Nenhum eixo opera isoladamente. O motor calcula impactos de segunda ordem considerando a dinâmica do setor público:
* **Efeito Financiamento:** Governança alta atrai novos fundos (+25%). Obras e programas cortados geram perda de repasses por inexecução (-35%). Tentar expandir programas sem orçamento gera déficit (-30%).
* **Efeito Governança:** Obras executadas sem controle geram gargalos de auditoria (-25%). Cortes orçamentários graves reduzem equipes técnicas e transparência (-15%).
* **Efeito Políticas Públicas:** Sofre freio de arrasto operacional se o suporte estrutural de Financiamento e Governança for insuficiente.

### 3. Rendimentos Decrescentes Logarítmicos
Para evitar projeções astronômicas ou irreais, o ajuste percentual aplicado utiliza atenuação logarítmica:
$$f(x) = 1.0 + \log(1 + x) \cdot 0.85$$

### 4. Normalização de Escala (0 a 100)
Tanto as notas base extraídas do CSV quanto as projeções calculadas pela equação de regressão são calibradas dinamicamente para uma régua padronizada de **0 a 100**, garantindo consistência nos KPIs e gráficos temporais.

---

## 📊 Estrutura dos Módulos & DTOs

* `TipoTradeOff`: Enum (`GANHO`, `PERDA`, `ALERTA`, `NEUTRO`) com metadados de cor Hexadecimal para renderização no Frontend.
* `SimulacaoResponse`: Retorna metadados da entidade, resumo executivo com diagnóstico textual, KPIs individuais dos eixos, dados interpolados para o gráfico de linha (2025-2028) e a lista dinâmica de trade-offs.

---

## 📁 Estrutura de Pastas do Repositório

```text
climaton-project/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       └── main/java/com/climaton/climautils/
│           ├── dto/
│           │   ├── enums/
│           │   │   └── TipoTradeOff.java
│           │   ├── request/
│           │   └── response/
│           ├── model/
│           └── service/
│               ├── CsvLoaderService.java
│               └── RegressionEngineService.java
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── pnpm-lock.yaml
    ├── app/
    ├── components/
    └── public/

    ---
```
## 🐳 Como Subir a Aplicação (Docker Compose)

Você pode subir toda a infraestrutura (Backend Spring Boot + Frontend Next.js) com um único comando na raiz do projeto:

### 1. Subir os containers
```bash
docker compose up --build
```

### 2. Acessar os serviços
Frontend (Dashboard): http://localhost:3000

Backend (API REST): http://localhost:8080

### 3. Parar a execução
```bash
docker compose down
```
## 🛠️ Execução Local para Desenvolvimento (Sem Docker)
### Backend
```bash
cd backend
mvn spring-boot:run
```
### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```