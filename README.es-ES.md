

# Herramienta de Recuperación de Figuras de Publicaciones

Esta herramienta proporciona un método para recuperar figuras de las publicaciones de [PMC](https://www.ncbi.nlm.nih.gov/labs/pmc/) del NCBI mediante la API de Entrez. La herramienta busca sistemáticamente publicaciones relacionadas con especies de plantas específicas y descarga las figuras asociadas con fines de investigación y análisis.

[![Follow on Twitter](https://img.shields.io/twitter/follow/alexjsully?style=social)](https://twitter.com/alexjsully)
[![GitHub repo size](https://img.shields.io/github/repo-size/AlexJSully/Publication-Figure-Retrieval)](https://github.com/AlexJSully/Publication-Figure-Retrieval)
[![GitHub](https://img.shields.io/github/license/AlexJSully/Publication-Figure-Retrieval)](https://github.com/AlexJSully/Publication-Figure-Retrieval)

## Características

- **Búsqueda Automatizada de Especies**: Busca publicaciones relacionadas con 27 especies de plantas
- **Extracción de Figuras**: Descarga figuras de alta calidad de artículos de PMC
- **Capacidad de Reanudación**: Almacena en caché los IDs de PMC procesados para reanudar descargas interrumpidas
- **Limitación de Solicitud**: Respeta los límites de la API del NCBI (3 solicitudes/segundo, 10 con clave de API)
- **Procesamiento por Lotes**: Procesa eficientemente miles de artículos por especie
- **Salida Organizada**: Estructura las figuras descargadas por especie e ID de publicación

## Aviso Legal

Este código se mantiene únicamente con fines educativos y de referencia histórica. La herramienta fue desarrollada originalmente para investigación académica. Tenga en cuenta que el uso de esta herramienta para recuperar figuras de publicaciones de PMC está sujeto a las políticas del NCBI. Úselo bajo su propio riesgo.

## Requisitos

- **Node.js**: Versión 20 o superior
- **RAM**: 4 GB como mínimo
- **Internet**: Conexión estable con velocidad de descarga superior a 7 MB/s

## Instalación y Configuración

### Inicio Rápido

Clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/AlexJSully/Publication-Figure-Retrieval.git
cd Publication-Figure-Retrieval
npm ci
```

### Configuración de la Clave API (Recomendada)

Para aumentar los límites de velocidad de la API de 3 a 10 solicitudes por segundo, obtenga una clave API del NCBI:

1. Visite la [Documentación de Claves API del NCBI](https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/)
2. Cree un archivo `.env` en la raíz del proyecto:

```bash
NCBI_API_KEY=your_api_key_here
```

### Ejecución de la Herramienta

Inicie el proceso de recuperación de figuras:

```bash
npm run start
```

La herramienta hará lo siguiente:

1. Procesará cada especie desde `src/data/species.json`
2. Buscará artículos relacionados en PMC
3. Descargará las figuras a `build/output/[species_name]/`
4. Almacenará el progreso en caché en `build/output/cache/id.json`

### Capacidad de Reanudación

Si se interrumpe, simplemente ejecute `npm run start` nuevamente. La herramienta:

- Verificará la caché en busca de IDs de PMC ya procesados
- Reanudará desde donde se quedó
- Omitirá las descargas duplicadas

Para restablecer y empezar desde cero, elimine el archivo de caché:

```bash
rm build/output/cache/id.json
```

## Estructura de Salida

Las figuras descargadas se organizan en una jerarquía estructurada:

```text
build/output/
├── cache/
│   └── id.json                    # Cached PMC IDs for resume capability
├── Arabidopsis_thaliana/
│   ├── PMC123456/
│   │   ├── figure1.jpg
│   │   └── figure2.png
│   └── PMC789012/
│       └── figure1.svg
├── Cannabis_sativa/
│   └── PMC345678/
│       ├── figure1.jpg
│       └── figure2.tiff
└── [other_species]/
```

## Problemas Conocidos

Nuestro objetivo es hacer esta herramienta lo más perfecta posible, pero lamentablemente, puede haber algunos errores imprevistos. Si logras encontrar uno que no esté aquí, no dudes en crear un informe de error para que podamos solucionarlo.

- Ninguno por el momento... ¡Ayúdanos a encontrar algunos!

## Documentación

Para obtener documentación completa, consulte la [documentación](docs/index.md):

- [**Primeros Pasos**](docs/index.md) - Vista general completa y guía de configuración
- [**Arquitectura**](docs/architecture/index.md) - Arquitectura técnica y flujo de procesamiento
- [**Guía de Uso**](docs/usage/index.md) - Flujos de trabajo de configuración, ejecución y solución de problemas
- [**Referencia de la API**](docs/usage/api/index.md) - Documentación de funciones a nivel de módulo
- [**Contribución**](CONTRIBUTING.md) - Configuración de desarrollo y pautas de contribución

## Licencia

[GNU GPL v2.0](LICENSE.md)

## Modo de Mantenimiento

Este proyecto se encuentra actualmente en **modo de mantenimiento**. Esto significa que:

- ✅ Se abordarán las **correcciones de errores críticos**
- ✅ Se implementarán **actualizaciones de seguridad** de manera inmediata
- ✅ Podrían aceptarse **mejoras menores** a la funcionalidad existente
- ❌ Es improbable que se implementen **nuevas funcionalidades**
- ❌ No se buscarán **refactorizaciones importantes** ni cambios arquitectónicos

**Tiempo de Respuesta:** Si bien nos esforzamos por solucionar los problemas de manera pronta, los tiempos de respuesta pueden variar. Se priorizarán los problemas de seguridad críticos.

**Contribución:** Sigue siendo bienvenidas las solicitudes de extracción (pull requests) para correcciones de errores y parches de seguridad. Por favor, revise las [Pautas de Contribución](CONTRIBUTING.md) antes de enviarlas.

## Autores

- Alexander Sullivan - [GitHub](https://github.com/AlexJSully), [Twitter](https://twitter.com/alexjsully), [ORCiD](https://orcid.org/0000-0002-4463-4473), [LinkedIn](https://www.linkedin.com/in/alexanderjsullivan/), [Website](https://alexjsully.me/)
