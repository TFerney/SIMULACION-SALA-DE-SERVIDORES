# 🖥️ Gemelo Digital 3D — Sala de Servidores & Simulación CFD Multivariable

**Proyecto de Aula / Symposium de Grado**  
**Autores**: Darwin Samuel Machuca González, Ferney Bladimir Bermúdez Toloza, Saray Valentina Silva Galindo  
**Programa**: Ingeniería en Ciencias de la Computación e Inteligencia Artificial  
**Institución**: Universidad de Santander (UDES)  

---

## 📖 Resumen Ejecutivo y Objetivo

Este gemelo digital interactivo 3D simula el comportamiento termodinámico y la dinámica de fluidos computacional (CFD) de un centro de datos de alta densidad. A diferencia de las aproximaciones convencionales donde la ventilación se sitúa de manera estática, en este sistema **la ubicación de los extractores de techo y las rejillas de inyección fría se calcula y optimiza dinámicamente mediante cálculo multivariable, integrales triples, gradientes vectoriales y divergencia volumétrica**.

---

## 📐 Marco Matemático Riguroso

### 1. Dominio Espacial e Integral Triple de Volumen
El centro de datos está definido como una región acotada $\Omega \subset \mathbb{R}^3$:
$$\Omega = [0, 10]\text{ m} \times [0, 15]\text{ m} \times [0, 3]\text{ m}$$

El volumen total de aire del recinto se calcula mediante la integral triple:
$$V = \iiint_{\Omega} dV = \int_{0}^{10} dx \int_{0}^{15} dy \int_{0}^{3} dz = [x]_0^{10} \cdot [y]_0^{15} \cdot [z]_0^3 = 10 \times 15 \times 3 = \mathbf{450.00\text{ m}^3}$$

Tanto la evaluación analítica como la suma de Riemann numérica convergen exactamente en **$450.00\text{ m}^3$**, como se comprueba en el HUD interactivo.

---

### 2. Distribución Térmica Cuadrática y Teorema del Valor Medio
La temperatura estratificada del recinto se modela mediante:
$$T(x,y,z) = 20 + z^2 \quad [^\circ\text{C}]$$
- **Nivel del suelo ($z = 0\text{ m}$):** $T(x,y,0) = 20.0^\circ\text{C}$ (Línea base fría de inyección).
- **Nivel del techo ($z = 3\text{ m}$):** $T(x,y,3) = 20 + 3^2 = 29.0^\circ\text{C}$ (Foco crítico de acumulación térmica).

Aplicando el **Teorema del Valor Medio para integrales múltiples**:
$$\bar{T} = \frac{1}{V} \iiint_{\Omega} T(x,y,z)\, dV = \frac{1}{450} \int_{0}^{10} dx \int_{0}^{15} dy \int_{0}^{3} (20 + z^2)\, dz$$

Evaluando la integral respecto a la altura $z$:
$$\int_{0}^{3} (20 + z^2)\, dz = \left[ 20z + \frac{z^3}{3} \right]_0^3 = 20(3) + \frac{27}{3} = 60 + 9 = 69$$
$$\iiint_{\Omega} T\, dV = 10 \times 15 \times 69 = 150 \times 69 = 10,350$$
$$\bar{T} = \frac{10,350}{450} = \frac{69}{3} = \mathbf{23.00^\circ\text{C}}$$

Este valor promedio de **$23^\circ\text{C}$** se valida en pantalla y cumple con los estándares internacionales **ASHRAE TC 9.9** para centros de cómputo.

---

### 3. Vector Gradiente $\nabla T$ y Regla de Optimización Dinámica
El vector gradiente indica la dirección y tasa de máxima variación térmica:
$$\nabla T(x,y,z) = \left( \frac{\partial T}{\partial x},\, \frac{\partial T}{\partial y},\, \frac{\partial T}{\partial z} \right) = (0,\, 0,\, 2z)$$

- **Puntos Fríos (Mínimos térmicos):** En el plano inferior $z = 0$, $\|\nabla T\| = 0$ y $T = 20^\circ\text{C}$. El algoritmo sitúa en estas coordenadas las rejillas perforadas de inyección de aire frío en el suelo técnico elevado.
- **Zonas Críticas (Puntos calientes / Máximos térmicos):** En el plano superior $z = 3$, $\nabla T = (0, 0, 6)$ alcanza su máxima dirección ascendente $+k$ y $T = 29^\circ\text{C}$. El algoritmo instancia dinámicamente los ventiladores de extracción en las coordenadas de mayor gradiente térmico sobre las filas de servidores.

---

### 4. Campo Vectorial Convectivo y Divergencia
El flujo tridimensional del aire está regido por:
$$\vec{F}(x,y,z) = (0.5x,\, 0.2y,\, 1.5 + z) \quad [\text{m/s}]$$

Aplicando el **operador divergencia**:
$$\operatorname{div} \vec{F} = \nabla \cdot \vec{F} = \frac{\partial(0.5x)}{\partial x} + \frac{\partial(0.2y)}{\partial y} + \frac{\partial(1.5 + z)}{\partial z}$$
$$\operatorname{div} \vec{F} = 0.5 + 0.2 + 1.0 = \mathbf{1.70\text{ s}^{-1}} > 0$$

Dado que $\operatorname{div} \vec{F} = 1.70 > 0$ de manera homogénea en todo el dominio $\Omega$, el campo actúa como una fuente continua en expansión. Físicamente, esto comprueba que **el aire caliente se expande volumétricamente y acelera hacia arriba ($1.5 + z$) rumbo a los extractores del techo**, satisfaciendo el Teorema de la Divergencia de Gauss.

---

## 🎮 Funcionalidades y Capas Interactivas del Gemelo Digital

1. **⚡ Botón de Optimización por Gradiente**:
   - Ejecuta en tiempo real el algoritmo multivariable, calcula $\nabla T$, identifica los puntos críticos y reubica automáticamente los ventiladores y rejillas de suelo con notificación toast.
2. **🌡️ Mapa de Calor Volumétrico 3D ($T(x,y,z)$)**:
   - Cuadrícula volumétrica tridimensional de 1,232 nodos térmicos coloreados cromáticamente de azul ($20^\circ\text{C}$) a rojo ($29^\circ\text{C}$), representativo de las Figuras 1 y 4 del artículo.
   - Incluye **Plano de Corte Z interactivo** ($0\text{m} \to 3\text{m}$) para inspeccionar secciones transversales de la sala.
3. **🧭 Campo Vectorial 3D Discreto ($\vec{F}(x,y,z)$)**:
   - Red de flechas direccionales 3D orientadas según $\vec{F}$ y coloreadas por magnitud $|\vec{F}|$ (de 1.5 a 7.5+ m/s), representativo de la Figura 3 del artículo.
4. **💨 Dinámica de Fluidos CFD (600 Streamlines)**:
   - 600 estelas fluidas consolidadas en GPU (Shader GLSL con 1 draw call, 60 FPS estables).
   - Simula las partículas saliendo del piso frío ($z=0$), acelerando a través de los servidores y expandiéndose hacia los extractores del techo.
5. **🖥️ Racks de Servidores Físicos (Obstáculos)**:
   - 10 gabinetes de alta densidad (2 filas de 5 racks) con 280 LEDs de cómputo instanciados con parpadeo asíncrono y modulación térmica.
6. **📐 Dominio Métrico y Ejes Cartesianos**:
   - Bounding box $[0, 10]\times[0, 15]\times[0, 3]\text{ m}$ con ejes cartesianos $X, Y, Z$ en el origen $(0,0,0)$ y marcas de escala por metro.
7. **🎥 Presets de Cámara**:
   - Perspectiva General, Vista Superior (Techo/Extractores), Perfil Z (Gradiente Vertical) y Pasillo Frío.
8. **📐 Modal de Demostración Matemática Formal**:
   - Desglose paso a paso de cada teorema, integral y operador vectorial con tipografía matemática.

---

## 🚀 Despliegue y Ejecución

La aplicación está construida en **HTML5, CSS3 y JavaScript ES Modules** utilizando **Three.js r165** vía CDN oficial. No requiere dependencias de Node.js ni compiladores.

Para ejecutarla:
```bash
# Navegar al directorio del proyecto:
cd C:\Users\Asus\.gemini\antigravity\scratch\gemelo-digital-sala-servidores

# Iniciar servidor local (Python u otro):
python -m http.server 8000
```
Luego abrir en el navegador web:
`http://localhost:8000`
O simplemente abrir `index.html` en navegadores compatibles con ES Modules locales.
