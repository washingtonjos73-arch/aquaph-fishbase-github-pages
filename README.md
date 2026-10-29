# AquaPH — integração FishBase / SeaLifeBase

Versão estática preparada para GitHub Pages. O workflow gera `data/fishbase-index.json` no deploy a partir dos snapshots Parquet publicados pelo projeto rOpenSci e publica o site.

## O que esta integração faz
- Gera um índice estático de nomes científicos, nomes comuns quando disponíveis e indicadores de ambiente.
- Usa o índice para complementar nomes exibidos para as espécies já catalogadas no AquaPH.
- Mantém a régua interativa de pH e os modos de água doce/marinha.
- Não baixa dezenas de milhares de registros no navegador.
- Mantém as faixas de pH separadas: elas continuam como referências orientativas locais do AquaPH e **não são atribuídas à API**.
- Se a geração/consulta do índice falhar, a interface continua funcionando com a lista local.

## Publicar no GitHub Pages
1. Extraia todos os arquivos deste ZIP para a raiz de um repositório GitHub (os arquivos `index.html`, `app.js` e `style.css` devem ficar na raiz).
2. Em **Settings → Pages**, selecione **GitHub Actions** como origem de publicação.
3. Envie os arquivos para a branch `main`. O workflow `.github/workflows/deploy.yml` gera o índice e publica o site.
4. A primeira execução pode levar alguns minutos, pois consulta os arquivos Parquet do FishBase e SeaLifeBase.
5. Confira **Actions → Build data and deploy AquaPH** para ver o resultado.

## Fonte e limitações
- FishBase/SeaLifeBase via rOpenSci: https://github.com/ropensci/fishbaseapi
- O acesso programático atual usa snapshots Parquet; a antiga API Ruby com endpoints personalizados foi descontinuada.
- Os snapshots podem não refletir a informação mais recente do site oficial.
- Os dados de pH, temperatura, tamanho e cuidado apresentados nos cards são referências locais e devem ser confirmados para espécie, linhagem e condições do aquário.
