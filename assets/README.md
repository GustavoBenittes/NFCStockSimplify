# Assets do NFCStockSimplify

Esta pasta contém os recursos visuais do aplicativo.

## Ícones

### icon.png
- **Tamanho:** 1024x1024px
- **Uso:** Ícone principal do app
- **Formato:** PNG com transparência
- **Descrição:** Logo do NFCStockSimplify

### adaptive-icon.png
- **Tamanho:** 1024x1024px
- **Uso:** Ícone adaptativo para Android 8.0+
- **Formato:** PNG
- **Área segura:** Círculo central de 66% (660px)

### iconNFC.png
- **Tamanho:** Variável
- **Uso:** Logo NFC exibido na tela de login
- **Formato:** PNG com transparência
- **Descrição:** Ícone de NFC usado na interface

### favicon.png
- **Tamanho:** 48x48px
- **Uso:** Favicon para versão web
- **Formato:** PNG

### splash-icon.png
- **Tamanho:** 1024x1024px
- **Uso:** Ícone exibido na splash screen
- **Formato:** PNG com transparência

### icon_default.png
- **Tamanho:** Variável
- **Uso:** Ícone de fallback/default
- **Formato:** PNG

## Configuração no app.config.js

```javascript
export default {
  // ...
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0056D2"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0056D2"
    }
  },
  web: {
    favicon: "./assets/favicon.png"
  }
};
```

## Diretrizes de Design

### Paleta de Cores
- **Primary:** #0056D2 (Azul Institucional)
- **Secondary:** #00C2CB (Ciano Vibrante)
- **Background:** #FFFFFF (Branco)

### Especificações Técnicas

#### Ícone Principal (icon.png)
- Mínimo: 1024x1024px
- Formato: PNG-24 com canal alpha
- Espaço de cor: sRGB
- Margem interna: 10% (102px de cada lado)

#### Adaptive Icon (Android)
- Tamanho total: 1024x1024px
- Área segura (círculo): 660px de diâmetro
- Centro: 512x512px
- Considere que cantos podem ser cortados

#### Splash Screen
- Centralizado em telas de qualquer tamanho
- Background: cor sólida (#0056D2)
- Ícone: não deve conter texto importante nas bordas

## Gerando Novos Assets

### Usando Expo
```bash
# Gerar ícones a partir de um arquivo base
npx expo-optimize

# Gerar splash screen
npx expo customize:prebuild
```

### Requisitos de Upload (Stores)

#### Google Play Store
- Ícone: 512x512px (PNG)
- Feature Graphic: 1024x500px
- Screenshots: Mínimo 2, resolução 1920x1080px ou maior

#### Apple App Store
- Ícone: 1024x1024px (sem transparência)
- Screenshots: Múltiplos tamanhos para diferentes dispositivos

## Substituindo Assets

1. Mantenha os mesmos nomes de arquivo
2. Respeite as dimensões mínimas
3. Use formato PNG com compressão otimizada
4. Teste em diferentes dispositivos
5. Execute `npx expo prebuild --clean` após alterações

## Otimização

```bash
# Otimizar PNGs (reduzir tamanho)
npm install -g pngquant
pngquant --quality=65-80 assets/icon.png --output assets/icon-optimized.png

# Ou usando ImageOptim (macOS)
# Ou TinyPNG online
```

## Notas

- Evite gradientes complexos em ícones pequenos
- Teste visibilidade em fundos claros e escuros
- Mantenha simplicidade para melhor reconhecimento
- Garanta contraste adequado

---

**Última atualização:** Dezembro 2025
