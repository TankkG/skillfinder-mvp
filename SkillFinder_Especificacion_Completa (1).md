# SKILLFINDER — Especificación funcional y técnica completa

> **Documento de trabajo para análisis, diseño, desarrollo y validación**  
> **Proyecto:** SkillFinder — Aplicación web y móvil para encontrar servicios mecánicos automotrices mediante geolocalización.  
> **Área piloto:** Distrito 2, municipio de Cercado, Cochabamba, Bolivia.  
> **Versión del documento:** 1.0  
> **Estado:** Especificación inicial ampliada; debe actualizarse con el prototipo visual del calendario y con las decisiones de implementación verificadas.

---

## 0. Cómo utilizar este documento

Este archivo funciona como fuente central de requisitos para desarrollar SkillFinder. Debe utilizarse para planificar tareas, construir el frontend, implementar el backend, diseñar MongoDB, probar las reservas y validar el producto con clientes y profesionales.

### 0.1. Convenciones

- **[MVP / Esencial]:** debe estar implementado para considerar funcional la primera versión piloto.
- **[Deseable]:** aporta valor y debe implementarse si el tiempo y los recursos lo permiten.
- **[Futuro]:** puede planificarse para una versión posterior.
- **[Pendiente de validar]:** requiere confirmación con la tutora, usuarios, profesionales o datos oficiales.
- **[Decisión técnica]:** debe quedar registrada en el repositorio cuando se elija la implementación definitiva.

Un requisito se considerará terminado solamente cuando esté implementado, integrado, probado, documentado y cumpla su criterio de aceptación. No debe marcarse como terminado solo porque exista una pantalla o un botón.

### 0.2. Relación con el documento de grado

Esta especificación toma como base el documento **SkillFinder_Perfil_UNIFRANZ_CARATULA_INDICES_REVISADOS** y desarrolla especialmente el Capítulo II: Ingeniería del Proyecto. Conserva las decisiones descritas allí: plataforma web y móvil, React Native, solución web compatible con React Native, Node.js, API REST, MongoDB, autenticación segura, geolocalización, sistema de reservas, reputación, administración, pruebas y metodología Scrumban.

Se detallan además decisiones funcionales ya establecidas para el producto:

1. El alcance funcional inicial se concentra en cuatro especialidades: **mecánicos, chaperos, gomeros y electricistas automotrices**.
2. La primera zona de operación y validación será el **Distrito 2 de Cercado, Cochabamba**.
3. El registro tendrá dos recorridos diferenciados: **Cliente** y **Profesional**.
4. El profesional registrará el nombre de su negocio o lugar de atención, su ubicación exacta en el mapa, los servicios en los que es experto y sus horarios de atención.
5. El mapa mostrará la ubicación del cliente como un punto azul y a los profesionales mediante marcadores diferenciados por especialidad.
6. Existirá un calendario amplio y visual para clientes y profesionales. La representación de una cita próxima crecerá visualmente a medida que se acerque su fecha. El diseño exacto queda pendiente de la imagen de referencia que se incorporará posteriormente.
7. El backend será responsable de evitar reservas duplicadas o intervalos incompatibles, incluso cuando dos clientes intenten reservar al mismo tiempo.
8. Cliente y profesional podrán calificarse mutuamente después de un servicio finalizado.

> **Importante sobre el alcance:** la documentación académica describe la primera versión sin procesamiento de pagos en línea. Esta especificación mantiene esa limitación. Los pagos, comisiones automatizadas y reembolsos no forman parte del MVP.

---

# 1. Visión general del sistema

## 1.1. Descripción

SkillFinder será una plataforma de intermediación de servicios automotrices que conectará a personas que necesitan asistencia para sus vehículos con profesionales cercanos registrados en la aplicación.

La plataforma estará disponible como:

- Aplicación móvil para Android.
- Aplicación web responsiva, utilizable desde computadoras, tabletas y navegadores móviles.
- Backend centralizado que expondrá una API REST.
- Base de datos MongoDB para usuarios, perfiles, servicios, ubicaciones, horarios, reservas, reseñas y registros del sistema.
- Panel administrativo web para validar profesionales, moderar perfiles y gestionar la operación del piloto.

El alcance geográfico inicial se limitará al Distrito 2 del municipio de Cercado, Cochabamba. La arquitectura deberá permitir que, en otra versión, se amplíe a otros distritos sin tener que reconstruir los módulos centrales.

## 1.2. Problema que resuelve

Actualmente, una persona que necesita un servicio automotriz puede depender de recomendaciones, llamadas, redes sociales o recorridos presenciales. Es difícil conocer de forma rápida qué profesional está cerca, qué tipo de trabajo realiza, dónde atiende, qué horarios tiene disponibles y qué experiencia han tenido otros clientes.

SkillFinder centralizará esa información y permitirá buscar, comparar, reservar y evaluar servicios desde un mismo sistema.

## 1.3. Objetivo general del producto

Desarrollar una aplicación web y móvil que permita localizar profesionales automotrices del Distrito 2 de Cercado, Cochabamba, consultar sus especialidades y disponibilidad, reservar un servicio y construir un historial de confianza mediante calificaciones de ambas partes.

## 1.4. Objetivos específicos

- Permitir el registro independiente de clientes y profesionales.
- Mostrar profesionales automotrices sobre un mapa interactivo.
- Permitir registrar y modificar la ubicación comercial del profesional desde el mapa.
- Permitir que cada profesional declare sus especialidades, servicios concretos y horarios de atención.
- Facilitar búsquedas por categoría, especialidad, distancia, reputación y disponibilidad.
- Proporcionar un calendario visual de disponibilidad y reservas.
- Evitar que se confirme más de una reserva incompatible para un mismo profesional y horario.
- Gestionar solicitudes, confirmaciones, rechazos, cancelaciones y finalización de servicios.
- Permitir calificaciones y comentarios en ambos sentidos, vinculados a reservas reales.
- Enviar avisos sobre cambios y próximas citas.
- Proteger los datos personales, las credenciales, los documentos y la ubicación de los usuarios.
- Validar el producto con un grupo piloto de usuarios y profesionales del área definida.

---

# 2. Alcance funcional

## 2.1. Funcionalidades incluidas en el MVP

1. Registro y autenticación de clientes.
2. Registro y autenticación de profesionales.
3. Perfil personal del cliente.
4. Perfil comercial y profesional.
5. Catálogo controlado de las cuatro especialidades automotrices.
6. Registro de servicios y subespecialidades que domina cada profesional.
7. Registro del nombre comercial y ubicación del negocio o lugar de atención.
8. Gestión de horarios semanales, pausas, días libres y bloqueos especiales.
9. Geolocalización y mapa centrados en el área piloto.
10. Búsqueda por especialidad, proximidad, calificación y disponibilidad.
11. Perfil público del profesional.
12. Calendario de citas y disponibilidad.
13. Solicitud, aceptación, rechazo y cancelación de reservas.
14. Bloqueo de franjas horarias y prevención de doble reserva en el backend.
15. Historial de reservas del cliente y del profesional.
16. Calificación del profesional por parte del cliente.
17. Calificación del cliente por parte del profesional.
18. Notificaciones sobre solicitudes y cambios de reservas, según los canales configurados.
19. Verificación documental y moderación por parte de un administrador.
20. Panel administrativo básico.
21. Términos de uso, política de privacidad y consentimiento de ubicación.
22. Pruebas funcionales, de concurrencia, seguridad básica y usabilidad.

## 2.2. Funcionalidades deseables

- Profesionales favoritos.
- Mensajería básica relacionada con una reserva.
- Fotografías de trabajos realizados.
- Reportes de perfiles o servicios.
- Preguntas frecuentes y soporte.
- Indicadores verificables como “Profesional verificado”.
- Rutas sugeridas hacia el negocio, cuando el proveedor de mapas lo permita.
- Exportación de información del perfil a PDF.

## 2.3. Funcionalidades fuera del MVP

- Pago y reembolso dentro de la aplicación.
- Gestión de dinero, billeteras o tarjetas.
- Expansión automática a todo el municipio o a otros departamentos sin validar antes el piloto.
- Categorías ajenas a los servicios automotrices definidos.
- Sistema de subastas o cotizaciones complejas entre varios profesionales.
- Pruebas A/B como requisito de la primera versión.
- Un sistema de calificación sin relación con una reserva finalizada.

## 2.4. Categorías permitidas

El catálogo inicial tendrá exclusivamente estas cuatro categorías principales:

| Código | Categoría | Descripción |
|---|---|---|
| MEC | Mecánico automotriz | Diagnóstico, mantenimiento y reparación mecánica de vehículos. |
| CHA | Chapero / Chapería | Reparación de carrocería, abolladuras y trabajos de chapería. |
| GOM | Gomero / Gomería | Reparación, mantenimiento y cambio de neumáticos. |
| ELA | Electricista automotriz | Diagnóstico y reparación de sistemas eléctricos y electrónicos del vehículo. |

**No se deben incorporar** categorías generales como carpintero, plomero o electricista de instalaciones. La categoría eléctrica siempre será **electricista automotriz**.

### 2.4.1. Subespecialidades sugeridas

El administrador podrá administrar el catálogo de subespecialidades. Como catálogo inicial de referencia:

- **Mecánico:** mantenimiento preventivo, diagnóstico de motor, frenos, suspensión, embrague, transmisión, refrigeración, escaneo y diagnóstico.
- **Chapero:** desabollado, enderezado, reparación de carrocería, soldadura de carrocería y preparación de superficies.
- **Gomero:** parchado, vulcanizado, cambio de neumáticos, balanceo, rotación y reparación de llantas.
- **Electricista automotriz:** batería, alternador, motor de arranque, iluminación, cableado, sensores, diagnóstico electrónico y sistemas de control.

Estas subespecialidades son una propuesta inicial. Deben revisarse con profesionales locales antes de cerrar el catálogo definitivo.

---

# 3. Actores, roles y permisos

## 3.1. Cliente

Es la persona que necesita contratar un servicio automotriz.

Puede:

- Crear una cuenta de cliente.
- Iniciar sesión y recuperar su contraseña.
- Completar y editar su información personal.
- Autorizar o denegar el acceso a su ubicación.
- Elegir su ubicación manualmente si no concede el permiso GPS.
- Buscar profesionales del Distrito 2.
- Consultar perfiles, servicios, horarios, calificaciones y reseñas.
- Consultar disponibilidad desde el calendario.
- Solicitar una reserva.
- Consultar el estado de sus solicitudes.
- Cancelar una reserva conforme a las reglas del sistema.
- Consultar su historial.
- Calificar al profesional después de finalizar el servicio.
- Consultar y responder notificaciones.
- Reportar un perfil o problema.

No puede modificar perfiles profesionales, cambiar horarios de otros profesionales, aprobar documentos ni intervenir en reservas ajenas.

## 3.2. Profesional automotriz

Es la persona o negocio que ofrece uno o más servicios de las cuatro categorías permitidas.

Puede:

- Crear una cuenta de profesional.
- Registrar información personal y comercial.
- Registrar el nombre del negocio, taller o lugar de atención.
- Seleccionar una o varias categorías permitidas.
- Seleccionar sus subespecialidades y servicios concretos.
- Describir experiencia y servicios ofrecidos.
- Registrar tarifas orientativas, si desea mostrarlas.
- Añadir fotografías de trabajos realizados.
- Seleccionar su ubicación comercial en un mapa.
- Registrar su dirección de referencia.
- Definir sus días y horarios habituales de atención.
- Crear pausas, días libres y bloqueos de fechas.
- Consultar solicitudes recibidas.
- Aceptar o rechazar solicitudes.
- Consultar su calendario de reservas.
- Consultar su historial de atención.
- Marcar un servicio como iniciado y finalizado, según permisos y reglas.
- Calificar al cliente después de una reserva finalizada.
- Consultar reseñas recibidas.
- Reportar problemas o conductas indebidas.

No puede modificar la ubicación, disponibilidad, perfil o reservas de otro profesional. Tampoco puede aprobar sus propios documentos ni editar calificaciones recibidas.

## 3.3. Administrador

Puede:

- Consultar usuarios y perfiles.
- Revisar documentos de verificación.
- Aprobar, rechazar o solicitar correcciones de documentos.
- Activar, suspender o bloquear cuentas conforme a políticas documentadas.
- Moderar reseñas y reportes.
- Gestionar categorías y subespecialidades.
- Configurar el área piloto y sus límites geográficos.
- Consultar estadísticas del sistema.
- Consultar registros de auditoría.
- Gestionar contenido de ayuda, términos y avisos.

Todas las acciones administrativas relevantes deben identificar al administrador responsable, la fecha, la acción y el registro afectado.

## 3.4. Separación de roles

En la pantalla inicial de registro deben aparecer dos opciones claramente separadas:

- **Registrarme como Cliente**
- **Registrarme como Profesional**

La selección determina el formulario y los permisos iniciales. El backend debe validar el rol; no basta con ocultar pantallas en el frontend. Una cuenta no debe poder ejecutar operaciones de ambos roles modificando un parámetro enviado desde la aplicación.

La posibilidad de que una misma persona tenga dos cuentas o solicite un cambio de rol queda como decisión de producto. No se debe permitir la autoasignación de rol administrativo.

---

# 4. Registro, autenticación y perfil

## 4.1. Registro de cliente

### Campos mínimos

- Nombre y apellido.
- Correo electrónico.
- Número de teléfono.
- Contraseña.
- Confirmación de contraseña en el formulario.
- Aceptación de términos de uso y política de privacidad.
- Consentimiento de ubicación cuando solicite utilizar GPS; este permiso debe ser independiente de la aceptación general.

### Reglas

- El correo debe tener formato válido y normalizarse antes de guardarse.
- El correo no puede estar asociado a otra cuenta activa.
- El teléfono debe validarse conforme al formato admitido.
- La contraseña nunca se almacena en texto plano.
- La verificación por correo o SMS debe quedar registrada cuando el proveedor esté configurado.
- Deben mostrarse mensajes claros ante datos incompletos, correo repetido o contraseña inválida.
- La recuperación de contraseña no debe revelar si un correo existe o no.

## 4.2. Registro de profesional

El formulario debe dividirse en pasos para evitar que el usuario tenga que completar una pantalla demasiado extensa.

### Paso 1. Datos personales y acceso

- Nombre y apellido del profesional responsable.
- Correo electrónico.
- Teléfono.
- Contraseña y confirmación.
- Aceptación de términos y política de privacidad.

### Paso 2. Datos del negocio o lugar de atención

- Nombre comercial del taller, negocio o lugar de atención.
- Descripción breve.
- Dirección escrita o referencia local.
- Ubicación exacta seleccionada en el mapa.
- Fotografía principal del negocio o lugar, cuando corresponda.
- Modalidad de atención: en el establecimiento y, si se habilita para ese perfil, atención a domicilio.

El nombre comercial y la ubicación deben estar asociados al perfil profesional. No se debe registrar un profesional como visible en el mapa si no tiene una ubicación válida y revisable.

### Paso 3. Especialidades y servicios

El profesional debe seleccionar una o varias de las cuatro categorías permitidas y declarar en cuáles es experto.

Para cada servicio debe poder especificar:

- Categoría principal.
- Subespecialidad.
- Nombre del servicio.
- Descripción del trabajo.
- Duración estimada para agenda, cuando corresponda.
- Precio orientativo opcional.
- Estado activo o inactivo.

La selección debe provenir del catálogo controlado. Si se admite una descripción libre, esta no debe crear una nueva categoría automáticamente.

### Paso 4. Horarios de atención

El profesional indicará:

- Días de atención.
- Hora de inicio y hora de cierre por día.
- Pausas o intervalos no laborables.
- Duración predeterminada de las citas, si aplica.
- Anticipación mínima para recibir reservas.
- Tiempo de preparación entre servicios, si necesita bloquear un margen.
- Fechas especiales de cierre o vacaciones.

Como rango inicial de operación del proyecto se contempla la atención entre **08:00 y 19:00**, sujeto a configuración y validación con el alcance definitivo. Ningún intervalo reservado puede quedar fuera del horario habilitado por el profesional.

### Paso 5. Documentación y verificación

- Tipo de documento solicitado por la administración.
- Archivo privado asociado al expediente.
- Estado: pendiente, aprobado, rechazado o requiere corrección.
- Motivo de rechazo o corrección, cuando corresponda.

Los documentos no serán públicos. El hecho de subir un documento no significa que el profesional ya esté verificado.

### Paso 6. Revisión y publicación

Antes de enviar el registro, el profesional debe revisar un resumen de su perfil. El backend validará los campos obligatorios y el estado inicial será `PENDING_VERIFICATION` o el estado operativo que defina el administrador.

La plataforma debe diferenciar entre:

- Cuenta creada.
- Perfil incompleto.
- Perfil pendiente de verificación.
- Perfil aprobado y visible.
- Perfil suspendido o rechazado.

Un perfil no aprobado no debe recibir reservas públicas, salvo que la política del piloto establezca expresamente una modalidad limitada de prueba.

## 4.3. Inicio de sesión y sesión

- Acceso mediante correo y contraseña.
- Validación de cuenta activa y rol.
- Emisión de token de acceso y mecanismo seguro de renovación.
- Cierre de sesión y revocación o invalidación de la sesión de renovación.
- Recuperación de contraseña.
- Protección contra intentos repetidos de inicio de sesión.
- Mensajes que no expongan información sensible.

## 4.4. Edición de perfiles

Cada usuario podrá editar únicamente los datos que le pertenecen. Los cambios sensibles —por ejemplo, ubicación comercial, documentos o datos que afectan la verificación— deben quedar registrados y, si corresponde, volver a revisión administrativa.

---

# 5. Geolocalización, mapa y área piloto

## 5.1. Área de operación

El área inicial de búsqueda de profesionales será el **Distrito 2 del municipio de Cercado, Cochabamba, Bolivia**.

La aplicación debe restringir los resultados del piloto a profesionales cuya ubicación comercial válida se encuentre dentro del área configurada. No debe asumirse que una coincidencia de texto como “Cochabamba” demuestra que el profesional está dentro del Distrito 2.

### Delimitación geográfica pendiente

El polígono oficial o de referencia del Distrito 2 debe incorporarse a la configuración del sistema después de verificarlo con una fuente territorial confiable o con el levantamiento de campo del proyecto. **No se deben inventar coordenadas ni dibujar límites aproximados como si fueran oficiales.**

El área debe almacenarse como un polígono GeoJSON configurable, para permitir su actualización sin modificar la lógica del buscador.

## 5.2. Mapa para el cliente

El mapa del cliente debe:

- Solicitar permiso de ubicación explicando para qué se utilizará.
- Mostrar la ubicación actual del cliente mediante un **punto azul** cuando el permiso esté concedido.
- Permitir mover el mapa y seleccionar manualmente un punto si el permiso está denegado o el GPS no está disponible.
- Mostrar profesionales aprobados del área piloto.
- Utilizar marcadores o iconos diferenciados para mecánicos, chaperos, gomeros y electricistas automotrices.
- Permitir tocar un marcador para abrir una tarjeta resumida del profesional.
- Permitir abrir el perfil completo desde esa tarjeta.
- Sincronizar los resultados del mapa con el listado de profesionales.
- Permitir filtros por categoría, especialidad, disponibilidad y calificación.
- Mostrar distancia aproximada, aclarando que puede variar respecto de una ruta real.
- Mostrar un estado vacío útil cuando no existan resultados.
- Evitar mostrar perfiles suspendidos, rechazados o no publicados.

## 5.3. Mapa para el profesional

Durante el registro y la edición del perfil, el profesional deberá:

1. Buscar una dirección o referencia.
2. Centrar el mapa en el lugar aproximado.
3. Colocar o mover un marcador hasta la ubicación exacta del negocio.
4. Confirmar la ubicación.
5. Ver una vista previa de cómo aparecerá ante los clientes.
6. Guardar coordenadas y dirección asociada.

La aplicación debe advertir que la ubicación comercial será visible a los clientes. La ubicación privada del profesional o del cliente no debe exponerse por defecto.

## 5.4. Consultas geoespaciales

La base de datos almacenará la ubicación del perfil profesional en formato GeoJSON `Point`, con coordenadas en el orden **[longitud, latitud]**.

Se deberá:

- Crear un índice geoespacial `2dsphere`.
- Validar latitud y longitud antes de guardar.
- Consultar profesionales dentro del polígono del Distrito 2.
- Aplicar filtros de categoría, estado de verificación y disponibilidad.
- Permitir ordenar por distancia y calificación.
- Poner un límite y paginación a los resultados.
- Probar consultas con coordenadas conocidas.

La ubicación actual del cliente solo se utilizará para la búsqueda solicitada. No se realizará seguimiento continuo en segundo plano en el MVP.

## 5.5. Proveedor de mapas

La aplicación utilizará una capa de abstracción para que la lógica de búsqueda no dependa de un proveedor particular. La selección definitiva de mapas, geocodificación y rutas debe considerar compatibilidad web/Android, términos de uso, límites gratuitos, costos y atribución requerida.

Como orientación de implementación:

- En web puede evaluarse Leaflet con OpenStreetMap u otro proveedor compatible.
- En Android debe seleccionarse una biblioteca de mapas compatible con React Native.
- Ambas plataformas deben consumir las mismas ubicaciones y resultados del backend.
- La visualización de mapas no debe conectarse directamente a MongoDB.

**[Decisión técnica pendiente]:** registrar en el repositorio el proveedor y las bibliotecas finalmente elegidas.

---

# 6. Búsqueda y perfil del profesional

## 6.1. Búsqueda

El cliente podrá buscar profesionales por:

- Categoría principal.
- Subespecialidad o nombre del servicio.
- Nombre del profesional o negocio.
- Palabras clave de la descripción.
- Cercanía a la ubicación actual o a un punto seleccionado manualmente.
- Disponibilidad para una fecha y hora.
- Calificación promedio.

La búsqueda estará restringida al área piloto durante la primera versión.

## 6.2. Ordenamiento

El usuario podrá elegir al menos uno de estos criterios:

- Más cercanos.
- Mejor calificados.
- Disponibles para la fecha seleccionada.

La interfaz debe indicar cuál es el criterio aplicado. No se debe presentar un profesional como “mejor calificado” si no existen suficientes datos o una regla verificable para justificarlo.

## 6.3. Tarjeta de resultados

Cada tarjeta podrá mostrar:

- Foto o imagen del negocio.
- Nombre comercial.
- Categoría y servicios destacados.
- Calificación promedio y cantidad de reseñas.
- Distancia aproximada.
- Próxima disponibilidad, si se puede calcular.
- Distintivo de verificación, solo si está aprobado.
- Acción para ver perfil.
- Acción para abrir calendario o reservar.

## 6.4. Perfil público del profesional

Debe mostrar:

- Nombre comercial y nombre del profesional responsable, según política de privacidad.
- Fotografía principal.
- Descripción.
- Categorías y subespecialidades.
- Lista de servicios activos.
- Tarifas orientativas, cuando estén registradas.
- Horarios de atención.
- Ubicación del establecimiento.
- Calificación promedio.
- Número de reseñas.
- Comentarios de clientes.
- Galería de trabajos, si está habilitada.
- Estado de verificación.
- Botón para consultar calendario.
- Botón para solicitar una reserva.

No se deben mostrar números de documento, archivos de identidad, credenciales privadas ni datos internos de administración.

---

# 7. Disponibilidad y horarios profesionales

## 7.1. Horario semanal

Cada profesional debe poder configurar un horario por día de la semana. Por ejemplo, puede atender de lunes a viernes en un intervalo y tener otro horario el sábado. El domingo puede estar cerrado.

El sistema debe admitir:

- Días abiertos y cerrados.
- Uno o más intervalos por día.
- Pausas intermedias.
- Horario especial por fecha.
- Vacaciones y días bloqueados.
- Tiempo de preparación entre citas, si se configura.
- Duración de cada servicio.

## 7.2. Generación de horarios disponibles

La disponibilidad que vea el cliente será calculada por el backend usando conjuntamente:

1. Horario habitual del profesional.
2. Duración estimada del servicio seleccionado.
3. Pausas y descansos.
4. Días bloqueados y excepciones.
5. Reservas pendientes que mantienen una retención activa.
6. Reservas confirmadas.
7. Tiempo de preparación entre servicios.
8. Anticipación mínima y máxima permitida para solicitar una cita.

El frontend no debe inventar ni calcular por su cuenta las horas que se pueden reservar. Debe presentar los intervalos devueltos por la API.

## 7.3. Unidad de tiempo

Para prevenir solapamientos, se recomienda manejar una unidad mínima de agenda configurable. La propuesta inicial es de **15 minutos**. Los servicios deberán tener duración en múltiplos de esa unidad o el backend deberá convertirlos a los bloques correspondientes.

Ejemplo: una cita de 45 minutos que comienza a las 10:00 ocupa los bloques 10:00, 10:15 y 10:30; el extremo 10:45 no forma parte de la cita. Otra reserva que intente ocupar cualquiera de esos bloques será incompatible.

## 7.4. Zona horaria

- Zona de presentación: `America/La_Paz`.
- El backend debe guardar instantes de fecha y hora en UTC.
- La conversión a hora local se realizará al presentar o interpretar solicitudes.
- Las reglas de agenda deben utilizar la zona horaria del área de servicio, no la zona horaria accidental del dispositivo.
- Deben probarse cambios de fecha, límites de día y citas próximas a medianoche.

---

# 8. Megacalendario de SkillFinder

## 8.1. Objetivo

El calendario será uno de los componentes principales de la experiencia. Permitirá al cliente elegir una fecha y hora y al profesional visualizar y administrar sus citas y disponibilidad.

El componente deberá ser visualmente amplio, fácil de leer y adaptable a móvil y web. La imagen de referencia que enviará el propietario del proyecto servirá para definir el diseño visual exacto, distribución, tamaños, colores y animaciones finales.

## 8.2. Vistas del calendario

Como mínimo:

- **Vista mensual:** permite identificar días con disponibilidad, citas y bloqueos.
- **Vista semanal:** muestra citas y espacios horarios de cada día.
- **Vista diaria:** presenta los intervalos disponibles y ocupados en orden cronológico.
- **Vista de agenda:** lista las próximas citas como tarjetas.

El calendario del cliente mostrará las fechas en las que puede solicitar servicios. El calendario del profesional permitirá ver citas confirmadas, solicitudes pendientes, pausas y bloqueos.

## 8.3. Efecto de ampliación al acercarse una fecha

Las fechas o tarjetas asociadas a citas próximas deben aumentar gradualmente su prominencia visual conforme se acerca la cita. La ampliación debe ayudar a reconocer lo urgente o próximo, sin alterar la información real de disponibilidad ni permitir que una fecha ocupada parezca libre.

Comportamiento inicial propuesto, ajustable después de recibir la imagen:

| Tiempo restante | Escala visual orientativa | Tratamiento |
|---|---:|---|
| Más de 7 días | 1.00 | Tamaño normal. |
| Entre 4 y 7 días | 1.04 | Leve énfasis. |
| Entre 2 y 3 días | 1.08 | Mayor presencia visual. |
| Menos de 48 horas | 1.12 | Tarjeta destacada. |
| Día de la cita | 1.15 | Máxima prioridad visual, junto con la hora y el estado. |

Estos valores son parámetros iniciales de diseño, no reglas de negocio. La fecha debe calcularse con la zona horaria `America/La_Paz`.

### Reglas visuales

- El crecimiento debe aplicarse preferentemente a la tarjeta de cita o al elemento destacado, no a todo el calendario de forma que desordene la cuadrícula.
- Usar transformaciones y capas visuales para evitar que un elemento agrandado tape datos importantes.
- El estado debe identificarse también mediante texto o icono, no solo por color.
- Evitar animaciones excesivas y respetar la preferencia de movimiento reducido del dispositivo.
- La ampliación nunca debe cambiar la hora almacenada ni el estado de una reserva.
- Si una cita se cancela o expira, debe dejar de ocupar un espacio confirmado y mostrarse con el estado correspondiente en el historial.

## 8.4. Información de cada fecha

Una fecha puede representar:

- Disponible.
- Parcialmente disponible.
- Completa, sin espacios libres.
- Bloqueada por el profesional.
- Con solicitud pendiente.
- Con reserva confirmada.
- Día no laborable.

Al seleccionar un día, el cliente verá los horarios realmente disponibles. El profesional verá los detalles correspondientes a sus propias reservas y bloqueos.

## 8.5. Estados visuales

Se propone distinguir:

- Solicitud pendiente.
- Reserva confirmada.
- Reserva rechazada.
- Reserva cancelada.
- Reserva expirada.
- Servicio en curso.
- Servicio finalizado.
- Ausencia o inasistencia, si la política lo contempla.

La leyenda exacta se mantendrá visible o accesible desde el calendario.

## 8.6. Interacción del cliente

1. Abre el perfil de un profesional.
2. Selecciona “Ver calendario” o “Reservar”.
3. Escoge el servicio.
4. Selecciona una fecha.
5. Consulta los intervalos disponibles.
6. Selecciona una hora.
7. Revisa profesional, servicio, fecha, hora, duración, lugar y notas.
8. Confirma la solicitud.
9. Visualiza el estado pendiente o confirmado, según la respuesta del profesional.
10. Recibe una notificación de los cambios.

## 8.7. Interacción del profesional

1. Accede a su calendario.
2. Visualiza semana, mes o agenda.
3. Consulta solicitudes pendientes.
4. Acepta o rechaza una solicitud.
5. Bloquea una fecha o intervalo.
6. Actualiza su horario semanal.
7. Consulta las próximas citas destacadas.
8. Actualiza el estado del servicio según los permisos definidos.

## 8.8. Regla crítica

**El calendario visual no es la fuente definitiva de verdad.** Aunque una hora aparezca libre en la pantalla, el backend debe comprobar nuevamente su disponibilidad y reservarla de manera atómica al recibir la solicitud. Esto es obligatorio para evitar que dos usuarios reserven el mismo horario.

---

# 9. Reservas y prevención absoluta de doble reserva

## 9.1. Flujo normal de una reserva

1. El cliente selecciona un profesional.
2. El cliente selecciona un servicio activo de ese profesional.
3. La aplicación solicita al backend las fechas y horas disponibles.
4. El cliente selecciona una franja.
5. El cliente confirma los datos de la solicitud.
6. El backend vuelve a validar el horario, la duración, el horario de atención y los bloqueos.
7. El backend intenta reclamar todos los bloques de tiempo necesarios dentro de una operación atómica.
8. Si la operación tiene éxito, registra la reserva como pendiente de respuesta del profesional y los bloques quedan retenidos.
9. El profesional recibe la solicitud y puede aceptarla o rechazarla.
10. Si acepta, la reserva pasa a confirmada y conserva los bloqueos.
11. Si rechaza, cancela o deja expirar la solicitud según la política, los bloqueos se liberan.
12. Al finalizar el servicio se habilitan las calificaciones de ambas partes.

## 9.2. Regla de unicidad

Para un mismo profesional, dos reservas no pueden ocupar el mismo bloque de disponibilidad ni intervalos que se solapen.

No basta con comparar solamente la hora de inicio. Se debe tomar en cuenta la duración total del servicio y los márgenes configurados.

## 9.3. Estrategia técnica recomendada

Implementar una colección de bloqueos de agenda (`bookingSlotLocks`) con una unidad mínima fija, por ejemplo 15 minutos.

Cada documento representará un bloque ocupado por una reserva e incluirá como mínimo:

- `professionalId`
- `slotStartAt`
- `bookingId`
- `lockStatus`
- `expiresAt`, si es una retención temporal
- `createdAt`

Crear un índice único compuesto:

```javascript
db.bookingSlotLocks.createIndex(
  { professionalId: 1, slotStartAt: 1 },
  { unique: true }
);
```

El índice impide que dos documentos ocupen la misma unidad de tiempo del mismo profesional. Todos los bloques que corresponden a la duración de una cita deben reclamarse dentro de una transacción o mecanismo atómico equivalente.

### 9.3.1. Operación atómica

Al crear una reserva, el backend debe:

1. Calcular todos los bloques que ocupa el servicio.
2. Iniciar una transacción soportada por el entorno MongoDB seleccionado, cuando la arquitectura lo permita.
3. Crear el documento de reserva.
4. Insertar todos los documentos de bloqueo.
5. Confirmar la transacción solo si todos los bloqueos se pudieron insertar.
6. Si cualquiera de los bloques ya está ocupado, revertir la operación completa y responder con conflicto.

Si se produce una colisión en el índice único, ninguna parte de la reserva debe quedar parcialmente registrada. El backend responderá con `409 Conflict` y la aplicación solicitará al cliente elegir otra hora.

Si el entorno MongoDB no admite transacciones, se deberá implementar y documentar una estrategia atómica alternativa. No se debe sustituir este control por una simple comprobación en el frontend.

### 9.3.2. Retención de solicitudes pendientes

Cuando una solicitud queda pendiente de aceptación, sus bloques deben permanecer retenidos durante el plazo definido por la aplicación. Se recomienda un tiempo configurable —por ejemplo, 15 minutos para la primera prueba—, sujeto a validación con profesionales.

Cuando la solicitud sea rechazada o expire:

- Cambiar el estado de la reserva.
- Liberar todos sus bloqueos asociados.
- Registrar fecha y causa.
- Notificar al cliente.

El proceso de expiración debe verificar que cada bloqueo todavía corresponde a esa reserva antes de eliminarlo, para no liberar por error un bloque que ya se haya asignado a una reserva posterior.

### 9.3.3. Protección contra doble toque y reintentos

El cliente móvil o web puede repetir una solicitud por doble toque, mala conexión o reintento. El endpoint de creación debe aceptar una clave de idempotencia por operación (`Idempotency-Key`) y devolver el mismo resultado para la repetición de una misma solicitud lógica, sin crear reservas adicionales.

### 9.3.4. Validación del intervalo

Antes de reservar, el backend debe comprobar:

- Que el profesional esté activo y habilitado para recibir reservas.
- Que el servicio pertenezca al profesional y esté activo.
- Que la fecha se encuentre dentro del rango permitido.
- Que el horario esté dentro de la jornada configurada.
- Que no se cruce con una pausa.
- Que no exista un bloqueo manual.
- Que todos los bloques estén libres.
- Que se respete el tiempo de preparación entre servicios.
- Que el cliente tenga autorización para reservar.

## 9.4. Estados de una reserva

Estados propuestos:

| Estado | Significado | Quién puede originarlo |
|---|---|---|
| `PENDING_PROFESSIONAL` | Solicitud recibida y horario retenido, pendiente de decisión. | Sistema al crear la solicitud. |
| `CONFIRMED` | El profesional aceptó la solicitud. | Profesional autorizado. |
| `REJECTED` | El profesional rechazó la solicitud. | Profesional autorizado. |
| `CANCELLED_BY_CLIENT` | El cliente canceló según política. | Cliente titular. |
| `CANCELLED_BY_PROFESSIONAL` | El profesional canceló según política. | Profesional titular. |
| `EXPIRED` | La solicitud superó el tiempo de respuesta permitido. | Sistema. |
| `IN_PROGRESS` | El servicio comenzó. | Según la regla de operación definida. |
| `COMPLETED` | El servicio fue finalizado. | Según la regla de operación definida. |
| `NO_SHOW` | Una parte no se presentó, si se implementa esta política. | Rol autorizado o administrador, con motivo. |

Las transiciones deben validarse en el backend. No se permitirá que el frontend envíe directamente cualquier estado.

## 9.5. Cancelaciones

La aplicación debe explicar la política de cancelación antes de que el cliente confirme. La versión inicial no procesará reembolsos ni pagos.

Al cancelar una reserva:

- Comprobar quién solicita la cancelación.
- Comprobar que el estado permita cancelar.
- Registrar responsable, fecha y motivo cuando corresponda.
- Liberar los bloqueos de agenda de forma segura.
- Actualizar el calendario.
- Notificar a la otra parte.

## 9.6. Criterios de aceptación de reservas

- Dos clientes que soliciten exactamente la misma hora para el mismo profesional no pueden obtener dos reservas válidas.
- Dos solicitudes cuyos intervalos se solapen no pueden quedar confirmadas.
- Dos solicitudes simultáneas deben producir como máximo una reserva válida para los mismos bloques.
- Una reserva rechazada, cancelada o expirada libera los bloques correspondientes.
- Una reserva confirmada mantiene los bloques ocupados.
- Un reintento con la misma clave de idempotencia no duplica la reserva.
- El historial conserva las reservas canceladas y rechazadas sin mostrarlas como disponibilidad activa.

---

# 10. Calificaciones y reputación en ambos sentidos

## 10.1. Calificación del profesional por el cliente

Después de que una reserva llegue a `COMPLETED`, el cliente podrá evaluar al profesional.

La evaluación incluirá:

- Calificación de 1 a 5 estrellas.
- Comentario opcional.
- Fecha de creación.
- Reserva asociada.
- Estado de moderación.

## 10.2. Calificación del cliente por el profesional

Después de que la misma reserva llegue a `COMPLETED`, el profesional podrá evaluar al cliente.

La evaluación incluirá:

- Calificación de 1 a 5 estrellas.
- Comentario opcional.
- Fecha de creación.
- Reserva asociada.
- Estado de moderación.

## 10.3. Reglas de integridad

- Solo pueden calificar los dos participantes de una reserva real.
- La reserva debe haber finalizado.
- Una reserva no puede generar múltiples calificaciones de la misma parte.
- Cliente y profesional pueden enviar su evaluación de forma independiente.
- No se puede calificar una reserva rechazada, expirada o cancelada como si el servicio se hubiera realizado.
- La API debe comprobar el usuario autenticado; no debe confiar en un `reviewerId` enviado libremente por el frontend.
- Las reseñas deben poder reportarse y moderarse.
- Las reseñas no deben poder modificarse para manipular la reputación sin una regla documentada.

## 10.4. Visualización de reputación

En el perfil del profesional se mostrará su promedio y las reseñas de clientes asociadas a servicios finalizados.

La reputación del cliente podrá mostrarse al profesional en el contexto de una solicitud o reserva, de acuerdo con la política de privacidad que se defina. No es obligatorio publicar los datos o comentarios de un cliente en el mapa público.

Los distintivos como “verificado” o “mejor calificado” solo aparecerán si existe un criterio medible y documentado.

---

# 11. Notificaciones y comunicación

## 11.1. Eventos que deben generar avisos

- Registro completado.
- Verificación de correo o teléfono.
- Perfil profesional aprobado, rechazado o pendiente de corrección.
- Nueva solicitud de reserva para el profesional.
- Solicitud enviada al profesional para el cliente.
- Reserva aceptada o rechazada.
- Reserva cancelada.
- Reserva próxima.
- Cambio en la fecha u hora, si se habilita la reprogramación.
- Solicitud expirada.
- Recordatorio para calificar después de finalizar el servicio.

## 11.2. Canales

- Notificación dentro de la aplicación.
- Push móvil cuando esté configurado.
- Correo electrónico para eventos críticos cuando el proveedor esté disponible.

## 11.3. Privacidad

Las notificaciones no deben incluir contraseñas, documentos, coordenadas privadas ni información sensible. Deben ofrecer un enlace o acción para abrir el detalle seguro dentro de la aplicación.

## 11.4. Recordatorios

Como propuesta inicial, se pueden enviar recordatorios antes de la cita, por ejemplo 24 horas y 2 horas antes. Los intervalos deben ser configurables y deben evitar enviar avisos duplicados.

## 11.5. Mensajería

La mensajería básica puede implementarse como función deseable asociada a una reserva. Debe evitar convertirse en un canal público sin control. La conversación debe estar restringida a los participantes de la reserva y conservar una política de moderación y reporte.

---

# 12. Panel administrativo

## 12.1. Dashboard

Debe mostrar, como mínimo:

- Cantidad de clientes registrados.
- Cantidad de profesionales registrados.
- Profesionales pendientes de verificación.
- Profesionales aprobados, suspendidos o rechazados.
- Reservas por estado.
- Reservas recientes.
- Reportes pendientes.
- Distribución por especialidad.

## 12.2. Gestión de profesionales

- Buscar perfiles.
- Ver datos comerciales necesarios para la revisión.
- Consultar documentos privados con permisos adecuados.
- Aprobar, rechazar o solicitar corrección.
- Registrar el motivo de la decisión.
- Suspender o reactivar un perfil conforme a una política.

## 12.3. Gestión de usuarios y contenido

- Consultar cuentas.
- Atender reportes.
- Moderar reseñas que incumplan las reglas.
- Mantener catálogo de categorías y subespecialidades.
- Administrar preguntas frecuentes y mensajes informativos.

## 12.4. Auditoría

Toda operación administrativa relevante debe registrar actor, acción, entidad afectada, fecha, resultado y motivo cuando corresponda. No se deben guardar contraseñas, tokens ni archivos privados completos en los logs.

---

# 13. Requerimientos funcionales consolidados

La siguiente matriz mantiene los requerimientos funcionales del documento de grado y añade los controles específicos necesarios para el flujo actualizado del sistema.

| Código | Requerimiento | Descripción verificable | Prioridad |
|---|---|---|---|
| RF001 | Registro de clientes | Crear cuenta con nombre, correo, teléfono y contraseña; verificar correo o teléfono cuando el canal esté configurado. | MVP |
| RF002 | Registro de profesionales | Crear cuenta y perfil comercial con horario, fotos, documentos, especialidades y ubicación. | MVP |
| RF003 | Inicio de sesión seguro | Autenticar con correo y contraseña, recuperar acceso y controlar sesiones. | MVP |
| RF004 | Búsqueda por ubicación | Usar GPS autorizado o ubicación manual y calcular cercanía aproximada. | MVP |
| RF005 | Mapa interactivo | Mostrar clientes y profesionales con marcadores y acceso a perfiles. | MVP |
| RF006 | Ordenamiento | Ordenar resultados por distancia o calificación e indicar el criterio. | MVP |
| RF007 | Perfil profesional | Mostrar foto, negocio, servicios, horarios, ubicación, tarifas orientativas y reseñas. | MVP |
| RF008 | Reservas y calendario | Solicitar horarios, registrar estados y visualizar citas. | MVP |
| RF009 | Notificaciones | Avisar confirmaciones, rechazos, recordatorios y cambios. | Deseable / Alta utilidad |
| RF010 | Calificaciones y comentarios | Permitir reseñas de 1 a 5 estrellas vinculadas a una reserva finalizada. | MVP |
| RF011 | Verificación documental | Permitir cargar documentos privados y que administración revise su estado. | MVP |
| RF012 | Favoritos | Guardar profesionales para consultas posteriores. | Futuro |
| RF013 | Mensajería básica | Coordinar detalles relacionados con una reserva. | Deseable |
| RF014 | Historial de reservas | Mostrar reservas anteriores y sus estados a cada participante autorizado. | MVP |
| RF015 | Filtros por especialidad y horario | Filtrar por las cuatro categorías, subespecialidad y disponibilidad. | MVP |
| RF016 | Indicadores de confiabilidad | Mostrar distintivos solo cuando existan criterios verificables. | Deseable |
| RF017 | Soporte y ayuda | Mostrar preguntas frecuentes y recibir reportes de incidencias. | Deseable |
| RF018 | Gestión de disponibilidad | Editar franjas, pausas, fechas bloqueadas y horarios semanales. | MVP |
| RF019 | Política de cancelación | Informar condiciones y aplicar reglas de cancelación; sin pagos ni reembolsos en línea en el MVP. | MVP |
| RF020 | Paginación de listados | Evitar resultados excesivos mediante paginación o carga incremental. | MVP |
| RF021 | Imágenes de perfiles | Cargar y mostrar fotografías con validación de formato y tamaño. | Deseable |
| RF022 | Información legal | Mostrar términos, privacidad y registrar aceptación cuando corresponda. | MVP |
| RF023 | Búsqueda por palabra clave | Buscar en nombres de servicios, categorías y descripciones. | MVP |
| RF024 | Manejo de conectividad | Mostrar estados de espera, reintentos seguros y mensajes ante errores de red. | MVP |
| RF025 | Exportación de perfil | Permitir exportar perfil a PDF si se prioriza posteriormente. | Futuro |
| RF026 | Bloqueo y moderación | Permitir suspender usuarios o perfiles incumplidores y registrar la acción. | MVP |
| RF027 | Retroalimentación | Recopilar comentarios y utilizarlos para mejora del sistema. | Deseable |
| RF028 | Preparación multilenguaje | Organizar textos para permitir otros idiomas en una etapa posterior. | Futuro |
| RF029 | Mapas y rutas | Mostrar rutas sugeridas si el proveedor elegido lo permite. | Deseable |
| RF030 | Pruebas A/B | Mantener como capacidad futura; no es necesaria para el MVP. | Futuro |
| RF031 | Roles separados | Presentar registro Cliente y registro Profesional con formularios y permisos distintos. | MVP |
| RF032 | Catálogo restringido | Permitir únicamente mecánico, chapero, gomero y electricista automotriz como categorías principales. | MVP |
| RF033 | Experticia profesional | Permitir seleccionar subespecialidades y servicios concretos que domina el profesional. | MVP |
| RF034 | Ubicación comercial | Registrar nombre del negocio y pin exacto del establecimiento en el mapa. | MVP |
| RF035 | Área piloto Distrito 2 | Limitar el buscador a profesionales dentro del polígono configurado del Distrito 2. | MVP |
| RF036 | Calendario visual ampliado | Presentar vistas mensual, semanal, diaria y agenda; destacar citas próximas con ampliación visual. | MVP |
| RF037 | Bloqueo de horario único | Impedir reservas iguales o solapadas para el mismo profesional. | MVP crítico |
| RF038 | Operación atómica de reserva | Registrar reserva y bloqueos en una operación atómica o equivalente. | MVP crítico |
| RF039 | Idempotencia de reservas | Evitar reservas duplicadas por doble toque o reintento de red. | MVP crítico |
| RF040 | Reseña bidireccional | Permitir que cliente y profesional se califiquen después del mismo servicio finalizado. | MVP |
| RF041 | Expiración de solicitudes | Liberar automáticamente los bloques de solicitudes pendientes que superen el plazo establecido. | MVP |
| RF042 | Ubicación alternativa | Permitir seleccionar manualmente un punto cuando no haya permiso GPS o señal suficiente. | MVP |
| RF043 | Bloqueos manuales | Permitir al profesional bloquear días, horas y periodos de vacaciones. | MVP |
| RF044 | Administración del área | Permitir configurar el polígono del área piloto sin cambiar el código del buscador. | Deseable |

---

# 14. Requerimientos no funcionales

| Código | Requerimiento | Condición o indicador | Prioridad |
|---|---|---|---|
| RNF001 | Disponibilidad | Objetivo propuesto del 99 % anual, sujeto a infraestructura y monitoreo reales. | Alta |
| RNF002 | Seguridad de autenticación | Proteger credenciales, validar entradas y reducir riesgos de inyección NoSQL, XSS y otros aplicables. | Alta |
| RNF003 | Seguridad de comunicaciones | Usar HTTPS/TLS entre clientes y servicios desplegados. | Alta |
| RNF004 | Rendimiento | Meta inicial: búsquedas en menos de 3 segundos y operaciones simples en menos de 1 segundo bajo pruebas acordadas. | Alta |
| RNF005 | Escalabilidad | Arquitectura modular que permita aumentar recursos según crecimiento. | Media |
| RNF006 | Privacidad | Consentimiento de ubicación, minimización y acceso limitado a datos personales. | Alta |
| RNF007 | Compatibilidad | Web compatible con navegadores modernos y Android probado en versiones definidas. | Alta |
| RNF008 | Usabilidad | Terminología clara, navegación consistente y mensajes comprensibles. | Alta |
| RNF009 | Mantenibilidad | Código modular, Git, documentación y pruebas automatizadas en componentes críticos. | Media |
| RNF010 | Copias de seguridad | Definir y probar recuperación de MongoDB según el entorno. | Media |
| RNF011 | Consumo de datos | Optimizar imágenes, consultas y listados para conexiones móviles. | Media |
| RNF012 | Archivos | Validar formatos JPEG/PNG y tamaños; utilizar almacenamiento externo cuando convenga. | Media |
| RNF013 | Auditoría | Registrar eventos críticos sin incluir secretos ni datos sensibles innecesarios. | Alta |
| RNF014 | Latencia geográfica | Usar índices geoespaciales y limitar resultados de proximidad. | Media |
| RNF015 | Accesibilidad | Contraste, tamaño de texto, etiquetas y navegación accesible. | Media |
| RNF016 | Calidad de software | Realizar pruebas unitarias, integración, extremo a extremo y rendimiento. | Alta |
| RNF017 | Despliegue reproducible | Documentar y automatizar despliegues cuando la infraestructura lo permita. | Media |
| RNF018 | Escalado de base de datos | Aplicar índices y respaldo; replicación o fragmentación solo cuando sea necesario. | Media |
| RNF019 | Cumplimiento | Revisar normativa aplicable en Bolivia y publicar términos y política de privacidad. | Alta |
| RNF020 | Protección de infraestructura | Restringir accesos a servidores, bases de datos y secretos mediante mínimo privilegio. | Media |
| RNF021 | Tolerancia a fallos | Gestionar errores temporales y reintentos limitados cuando sean seguros. | Media |
| RNF022 | Monitoreo | Medir errores, tiempos de respuesta y disponibilidad. | Media |
| RNF023 | Concurrencia | Probar comportamiento ante solicitudes simultáneas de reservas. | Alta |
| RNF024 | Documentación de API | Documentar rutas, parámetros, respuestas, errores y autorización; evaluar OpenAPI/Swagger. | Media |
| RNF025 | Desarrollo seguro | Revisar código y dependencias, proteger secretos y corregir vulnerabilidades. | Alta |
| RNF026 | Integridad de agenda | No aceptar dos reservas incompatibles para el mismo profesional, incluso bajo concurrencia. | MVP crítico |
| RNF027 | Consistencia horaria | Guardar fechas de forma consistente y presentar agenda en `America/La_Paz`. | Alta |
| RNF028 | Disponibilidad verificable | El horario mostrado debe derivar de datos del backend y no de cálculos aislados del frontend. | Alta |
| RNF029 | Animación accesible | La ampliación de citas próximas debe ser clara, moderada y respetar movimiento reducido. | Media |
| RNF030 | Integridad de reseñas | Una calificación por participante y reserva; solo después de completar el servicio. | Alta |

---

# 15. Arquitectura técnica

## 15.1. Arquitectura lógica

La solución tendrá tres bloques principales:

```text
┌──────────────────────────────┐       ┌─────────────────────────────┐
│       CLIENTE WEB            │       │      APP ANDROID            │
│ React Native Web / Web       │       │ React Native                │
│ Mapa, perfiles, calendario   │       │ Mapa, perfiles, calendario  │
└──────────────┬───────────────┘       └──────────────┬──────────────┘
               │                                      │
               └──────────────────┬───────────────────┘
                                  │ HTTPS / JSON
                                  ▼
                      ┌────────────────────────┐
                      │       BACKEND          │
                      │       Node.js          │
                      │       API REST         │
                      │ Auth, roles, reservas, │
                      │ agenda, geolocalización│
                      └───────────┬────────────┘
                                  │
                 ┌────────────────┼──────────────────┐
                 ▼                ▼                  ▼
          ┌────────────┐  ┌────────────────┐  ┌────────────────┐
          │ MongoDB    │  │ Almacenamiento │  │ Notificaciones │
          │ Datos      │  │ de imágenes y  │  │ Push / correo  │
          │ e índices  │  │ documentos      │  │                │
          └────────────┘  └────────────────┘  └────────────────┘
```

## 15.2. Frontend móvil

**Tecnología base:** React Native con TypeScript.

Responsabilidades:

- Pantallas de registro e inicio de sesión.
- Navegación según rol.
- Formularios y validación de experiencia de usuario.
- Solicitud de permisos GPS.
- Mapa móvil y marcadores.
- Búsqueda y tarjetas de profesionales.
- Perfil del profesional.
- Calendario de selección de horarios.
- Solicitud y seguimiento de reservas.
- Historial y reseñas.
- Notificaciones push, si el proveedor se configura.
- Almacenamiento seguro de credenciales de sesión.

## 15.3. Frontend web

La documentación de grado declara React Native para web y móvil. Se debe confirmar la solución real utilizada para ejecutar componentes en navegador, por ejemplo React Native Web, o documentar el cliente web separado si esa es la implementación elegida.

La versión web debe ser responsiva y cubrir las funciones del cliente y profesional. El panel administrativo se podrá incluir como un módulo web protegido por rol.

**No se debe declarar que la versión web está implementada solo porque el proyecto compila para Android.** Debe probarse en navegadores reales.

## 15.4. Backend

**Tecnología base:** Node.js y TypeScript, exponiendo una API REST en JSON.

Responsabilidades:

- Registro, inicio de sesión y recuperación de acceso.
- Autorización por roles.
- Validación de datos.
- Gestión de perfiles y servicios.
- Consultas geoespaciales.
- Cálculo de disponibilidad.
- Creación atómica de reservas y bloqueos.
- Gestión de estados de reserva.
- Calificaciones y moderación.
- Notificaciones.
- Auditoría.
- Conexión segura a MongoDB y servicios externos.

Puede utilizarse Express u otro framework Node.js si es consistente con el repositorio. La selección definitiva debe basarse en el código existente y quedar registrada.

## 15.5. Base de datos

**Tecnología base:** MongoDB.

El cliente móvil y web nunca se conectarán directamente a MongoDB. Toda operación debe pasar por la API para validar datos, permisos y reglas de negocio.

## 15.6. Servicios externos

Se pueden integrar proveedores para:

- Mapas y geocodificación.
- Rutas.
- Envío de correos.
- Notificaciones push.
- Almacenamiento de imágenes y documentos.

Antes de elegirlos, se deben revisar compatibilidad, límites de uso, costos, privacidad y condiciones de servicio.

---

# 16. Diseño de base de datos MongoDB

Las siguientes colecciones son el modelo inicial de referencia. Los nombres y campos definitivos deberán coincidir con el código implementado.

## 16.1. Colección `users`

Identidad y credenciales de cada cuenta.

Campos sugeridos:

- `_id`
- `name`
- `emailNormalized`
- `phone`
- `passwordHash`
- `role`: `CLIENT`, `PROFESSIONAL` o `ADMIN`
- `status`: `ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`, `BLOCKED`
- `emailVerifiedAt`
- `phoneVerifiedAt`
- `termsAcceptedAt`
- `privacyAcceptedAt`
- `createdAt`
- `updatedAt`

Índices:

- Correo normalizado único.
- Índices para rol y estado cuando sean necesarios.

## 16.2. Colección `professionalProfiles`

Datos comerciales y de ubicación del profesional.

Campos sugeridos:

- `_id`
- `userId`
- `displayName`
- `businessName`
- `description`
- `categories[]`
- `specialties[]`
- `addressText`
- `location`: GeoJSON `Point`
- `serviceAreaId`
- `scheduleSummary`
- `verificationStatus`
- `isVisible`
- `ratingSummary`
- `createdAt`
- `updatedAt`

Índices:

- `userId` único si cada cuenta tiene un solo perfil profesional.
- `location` con índice `2dsphere`.
- Categorías, estado de publicación y verificación para filtros.

## 16.3. Colección `serviceCategories`

Catálogo administrable de categorías y subcategorías. Las cuatro categorías iniciales deben mantenerse restringidas.

Campos sugeridos:

- `_id`
- `code`
- `name`
- `description`
- `parentId`, si se utilizan subcategorías
- `active`
- `sortOrder`

## 16.4. Colección `services`

Servicios que ofrece cada profesional.

Campos sugeridos:

- `_id`
- `professionalId`
- `categoryId`
- `specialtyId`
- `name`
- `description`
- `estimatedDurationMinutes`
- `estimatedPrice`
- `active`
- `createdAt`
- `updatedAt`

## 16.5. Colección `weeklySchedules`

Horario semanal de atención.

Campos sugeridos:

- `_id`
- `professionalId`
- `dayOfWeek`
- `intervals[]`: hora de inicio y fin
- `breaks[]`
- `active`
- `timezone`

## 16.6. Colección `availabilityExceptions`

Bloqueos y cambios puntuales.

Campos sugeridos:

- `_id`
- `professionalId`
- `startAt`
- `endAt`
- `type`: `BLOCKED`, `SPECIAL_HOURS`, `VACATION`, `BREAK`
- `reason`
- `createdAt`

## 16.7. Colección `bookings`

Registro principal de una reserva.

Campos sugeridos:

- `_id`
- `customerId`
- `professionalId`
- `serviceId`
- `startAt`
- `endAt`
- `timezone`
- `status`
- `notes`
- `serviceLocationType`
- `serviceLocation`, si se habilita atención a domicilio
- `idempotencyKey`
- `holdExpiresAt`
- `acceptedAt`
- `rejectedAt`
- `cancelledAt`
- `completedAt`
- `createdAt`
- `updatedAt`

Índices:

- Cliente por fecha y estado.
- Profesional por fecha y estado.
- Índices para recuperar historial y agenda.
- Idempotencia por usuario y clave, según el diseño definitivo.

## 16.8. Colección `bookingSlotLocks`

Colección crítica para impedir horarios duplicados.

Campos sugeridos:

- `_id`
- `professionalId`
- `slotStartAt`
- `bookingId`
- `lockStatus`
- `expiresAt`
- `createdAt`

Índice obligatorio:

```javascript
db.bookingSlotLocks.createIndex(
  { professionalId: 1, slotStartAt: 1 },
  { unique: true }
);
```

Los documentos de bloqueo deben crearse y liberarse de acuerdo con los estados de reserva, mediante transacciones o una operación atómica equivalente.

## 16.9. Colección `reviews`

Debe almacenar tanto la reseña de cliente a profesional como la de profesional a cliente.

Campos sugeridos:

- `_id`
- `bookingId`
- `reviewerId`
- `revieweeId`
- `reviewerRole`
- `direction`: `CUSTOMER_TO_PROFESSIONAL` o `PROFESSIONAL_TO_CUSTOMER`
- `rating`
- `comment`
- `moderationStatus`
- `createdAt`

Índice único recomendado: `{ bookingId: 1, reviewerId: 1 }`.

## 16.10. Colección `verificationDocuments`

- `_id`
- `professionalId`
- `documentType`
- `storageReference`
- `status`
- `reviewedBy`
- `reviewedAt`
- `rejectionReason`
- `createdAt`

El archivo debe estar en almacenamiento privado. MongoDB guarda la referencia y metadatos mínimos necesarios, no necesariamente el archivo binario completo.

## 16.11. Colección `notifications`

- `_id`
- `userId`
- `type`
- `title`
- `message`
- `entityType`
- `entityId`
- `readAt`
- `deliveryStatus`
- `createdAt`

## 16.12. Colección `favorites`

- `_id`
- `customerId`
- `professionalId`
- `createdAt`

Índice único recomendado para que un cliente no guarde varias veces al mismo profesional.

## 16.13. Colección `reports`

- `_id`
- `reporterId`
- `targetType`
- `targetId`
- `reason`
- `description`
- `status`
- `assignedAdminId`
- `resolution`
- `createdAt`
- `resolvedAt`

## 16.14. Colección `auditLogs`

- `_id`
- `actorId`
- `action`
- `entityType`
- `entityId`
- `result`
- `createdAt`
- `metadata` limitada y sin secretos

## 16.15. Colección `serviceAreas`

- `_id`
- `code`
- `name`
- `municipality`
- `department`
- `country`
- `boundary`: polígono GeoJSON validado
- `active`
- `sourceReference`
- `updatedAt`

El polígono del Distrito 2 debe documentar su fuente y fecha de validación.

---

# 17. API REST propuesta

Las rutas son un contrato inicial. Los endpoints definitivos deberán documentarse con parámetros, cuerpos, respuestas, errores y permisos en OpenAPI/Swagger o documento equivalente.

## 17.1. Autenticación

| Método | Ruta | Uso | Acceso |
|---|---|---|---|
| POST | `/api/auth/register/client` | Registrar cliente. | Público con validación. |
| POST | `/api/auth/register/professional` | Registrar profesional. | Público con validación. |
| POST | `/api/auth/login` | Iniciar sesión. | Público con controles antiabuso. |
| POST | `/api/auth/refresh` | Renovar sesión. | Token de renovación válido. |
| POST | `/api/auth/logout` | Cerrar sesión. | Usuario autenticado. |
| POST | `/api/auth/forgot-password` | Solicitar recuperación. | Público con limitación de intentos. |
| POST | `/api/auth/reset-password` | Cambiar contraseña mediante token válido. | Público con token temporal. |
| GET | `/api/auth/me` | Consultar usuario autenticado. | Usuario autenticado. |

## 17.2. Profesionales y servicios

| Método | Ruta | Uso | Acceso |
|---|---|---|---|
| GET | `/api/professionals` | Listar y filtrar profesionales. | Según política de publicación. |
| GET | `/api/professionals/nearby` | Buscar por coordenadas, radio y área piloto. | Público o autenticado según política. |
| GET | `/api/professionals/:id` | Consultar perfil público. | Según política. |
| PUT | `/api/professionals/me` | Actualizar perfil propio. | Profesional autenticado. |
| POST | `/api/professionals/me/location` | Registrar o actualizar ubicación comercial. | Profesional autenticado. |
| GET | `/api/professionals/:id/services` | Consultar servicios de un profesional. | Según política. |
| POST | `/api/professionals/me/services` | Crear servicio propio. | Profesional autenticado. |
| PUT | `/api/professionals/me/services/:serviceId` | Editar servicio propio. | Profesional autenticado. |
| GET | `/api/service-categories` | Obtener catálogo activo. | Público. |

## 17.3. Disponibilidad y calendario

| Método | Ruta | Uso | Acceso |
|---|---|---|---|
| GET | `/api/professionals/:id/availability` | Consultar horarios libres entre fechas. | Según política. |
| GET | `/api/professionals/me/calendar` | Consultar agenda propia. | Profesional autenticado. |
| PUT | `/api/professionals/me/schedule` | Guardar horario semanal. | Profesional autenticado. |
| POST | `/api/professionals/me/availability-exceptions` | Crear bloqueo o excepción. | Profesional autenticado. |
| DELETE | `/api/professionals/me/availability-exceptions/:id` | Eliminar bloqueo propio permitido. | Profesional autenticado. |

## 17.4. Reservas

| Método | Ruta | Uso | Acceso |
|---|---|---|---|
| POST | `/api/bookings` | Solicitar una reserva y reclamar bloques. | Cliente autenticado. |
| GET | `/api/bookings/me` | Consultar historial propio. | Usuario autenticado. |
| GET | `/api/bookings/:id` | Consultar detalle de reserva propia. | Participante autorizado o administrador. |
| PATCH | `/api/bookings/:id/accept` | Aceptar solicitud. | Profesional asignado. |
| PATCH | `/api/bookings/:id/reject` | Rechazar solicitud. | Profesional asignado. |
| PATCH | `/api/bookings/:id/cancel` | Cancelar según política. | Participante autorizado. |
| PATCH | `/api/bookings/:id/start` | Marcar servicio iniciado. | Rol autorizado. |
| PATCH | `/api/bookings/:id/complete` | Marcar servicio finalizado. | Rol autorizado. |

El endpoint de creación debe recibir una clave de idempotencia y devolver `409 Conflict` cuando uno o más bloques ya no estén disponibles.

## 17.5. Reseñas

| Método | Ruta | Uso | Acceso |
|---|---|---|---|
| POST | `/api/bookings/:id/reviews` | Registrar reseña del participante autenticado. | Cliente o profesional participante; reserva completada. |
| GET | `/api/professionals/:id/reviews` | Consultar reseñas del profesional. | Según política de publicación. |
| POST | `/api/reviews/:id/report` | Reportar una reseña. | Usuario autenticado. |

El backend decidirá la dirección de la reseña según el rol del usuario y la reserva. El frontend no podrá hacerse pasar por el otro participante.

## 17.6. Notificaciones y administración

| Método | Ruta | Uso | Acceso |
|---|---|---|---|
| GET | `/api/notifications/me` | Consultar notificaciones propias. | Usuario autenticado. |
| PATCH | `/api/notifications/:id/read` | Marcar notificación como leída. | Propietario. |
| GET | `/api/admin/professionals/pending` | Listar perfiles pendientes. | Administrador. |
| PATCH | `/api/admin/professionals/:id/verification` | Aprobar o rechazar verificación. | Administrador. |
| PATCH | `/api/admin/users/:id/status` | Suspender o reactivar usuario. | Administrador. |
| GET | `/api/admin/reports` | Consultar reportes. | Administrador. |
| PATCH | `/api/admin/reports/:id` | Resolver reporte. | Administrador. |
| PUT | `/api/admin/service-areas/:id` | Actualizar polígono de área piloto. | Administrador autorizado. |

## 17.7. Respuestas y códigos HTTP

Como mínimo, utilizar:

- `200 OK`: consulta o modificación correcta.
- `201 Created`: recurso creado.
- `204 No Content`: operación correcta sin cuerpo de respuesta.
- `400 Bad Request`: datos inválidos.
- `401 Unauthorized`: falta autenticación o token válido.
- `403 Forbidden`: usuario autenticado sin permiso.
- `404 Not Found`: recurso inexistente o no accesible.
- `409 Conflict`: conflicto de agenda, duplicado o estado incompatible.
- `422 Unprocessable Entity`: datos con formato correcto pero reglas de negocio incumplidas.
- `429 Too Many Requests`: límite de solicitudes alcanzado.
- `500 Internal Server Error`: error no previsto, sin exponer detalles internos.

Todas las respuestas de error deben tener un formato consistente y un mensaje comprensible para la interfaz.

---

# 18. Seguridad, privacidad y protección de datos

## 18.1. Credenciales y sesiones

- Guardar contraseñas mediante hashing seguro, nunca en texto plano.
- Utilizar tokens firmados con expiración.
- Proteger los tokens en el almacenamiento seguro apropiado para cada plataforma.
- Aplicar autorización en backend para cada ruta protegida.
- No incluir secretos en el código ni en el repositorio.
- Guardar variables sensibles en archivos de entorno no versionados o un gestor de secretos.

## 18.2. Autorización

- Un cliente solo administra su cuenta y sus reservas.
- Un profesional solo administra su perfil, servicios, agenda y reservas asignadas.
- Un administrador accede a funciones administrativas según permisos.
- El backend debe validar la propiedad del recurso en cada operación.
- Ocultar botones no sustituye controles de autorización del servidor.

## 18.3. Protección de entradas

- Validar y normalizar todos los datos recibidos.
- Limitar longitudes, formatos y tipos.
- Validar identificadores.
- Prevenir inyección NoSQL.
- Sanitizar contenido que vaya a mostrarse en interfaces.
- Limitar frecuencia de inicio de sesión, registro, recuperación y creación de reservas.
- Validar MIME type y tamaño de archivos; no confiar solo en la extensión.

## 18.4. Privacidad de ubicación

- Explicar el propósito antes de solicitar el GPS.
- Permitir búsqueda manual cuando el usuario no conceda el permiso.
- No rastrear la ubicación del cliente de forma continua en el MVP.
- No hacer pública la ubicación exacta del cliente.
- Mostrar la ubicación comercial del profesional porque es un dato necesario para encontrar el servicio, con consentimiento informado.
- Restringir el acceso a documentos y datos personales.

## 18.5. Archivos

- Los documentos de verificación serán privados.
- Las imágenes públicas de perfiles se almacenarán separadas de los documentos sensibles.
- Validar formato, tamaño y tipo real del archivo.
- Generar nombres internos no predecibles.
- Aplicar permisos de acceso y enlaces temporales para documentos privados.

## 18.6. Comunicaciones e infraestructura

- HTTPS/TLS en producción.
- CORS limitado a clientes permitidos.
- Secretos y cadenas de conexión protegidos.
- Acceso a MongoDB limitado a la API y administración autorizada.
- Copias de seguridad y prueba de restauración.
- Logs protegidos y sin tokens ni contraseñas.
- Monitoreo de errores y disponibilidad.

## 18.7. Consideraciones legales

Antes del piloto se debe revisar la normativa boliviana vigente aplicable al tratamiento de datos personales, elaborar términos de uso y política de privacidad, explicar la finalidad de los datos y obtener los consentimientos correspondientes. Esta especificación no sustituye una revisión jurídica.

---

# 19. Interfaz y pantallas

## 19.1. Pantallas comunes

- Pantalla de bienvenida.
- Selección de registro: Cliente o Profesional.
- Inicio de sesión.
- Recuperación de contraseña.
- Verificación de cuenta.
- Términos y política de privacidad.
- Perfil y configuración de cuenta.
- Centro de notificaciones.
- Ayuda y reportes.

## 19.2. Pantallas de cliente

1. Inicio del cliente.
2. Mapa de profesionales.
3. Listado de resultados.
4. Filtros de búsqueda.
5. Perfil del profesional.
6. Catálogo de servicios del profesional.
7. Calendario y selección de fecha.
8. Selección de hora.
9. Resumen y confirmación de solicitud.
10. Detalle de reserva y estado.
11. Próximas citas.
12. Historial de reservas.
13. Calificación del profesional.
14. Reseñas recibidas, si corresponde.
15. Favoritos, si se implementa.

## 19.3. Pantallas de profesional

1. Registro por pasos.
2. Datos personales.
3. Datos comerciales.
4. Selección de especialidades.
5. Registro de servicios.
6. Mapa para fijar ubicación.
7. Horarios semanales.
8. Bloqueos y excepciones.
9. Estado de verificación.
10. Dashboard profesional.
11. Solicitudes pendientes.
12. Detalle de reserva.
13. Megacalendario profesional.
14. Historial.
15. Calificación del cliente.
16. Reseñas recibidas.
17. Edición del perfil.

## 19.4. Pantallas administrativas

- Dashboard general.
- Lista de profesionales pendientes.
- Detalle de expediente.
- Gestión de usuarios.
- Gestión de categorías y subespecialidades.
- Gestión de reseñas reportadas.
- Gestión de reportes.
- Configuración de Distrito 2.
- Auditoría.

## 19.5. Reglas generales de UI/UX

- Interfaz clara, consistente y responsiva.
- Botones con etiquetas inequívocas.
- Formularios con validación y mensajes junto al campo correspondiente.
- Indicadores de carga y estados vacíos.
- Confirmación antes de acciones sensibles.
- Contraste suficiente y tamaños táctiles apropiados.
- No depender exclusivamente de colores para comunicar estados.
- Conservar la misma terminología en web y Android.
- No mostrar una reserva como confirmada hasta recibir la confirmación del backend.

---

# 20. Estructura sugerida del repositorio

La estructura es una propuesta base para mantener separados el cliente, el backend y los elementos compartidos. Debe adaptarse al repositorio existente sin mezclar dos arquitecturas incompatibles.

```text
SkillFinder/
├── apps/
│   ├── client/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── navigation/
│   │   │   ├── screens/
│   │   │   │   ├── auth/
│   │   │   │   ├── client/
│   │   │   │   ├── professional/
│   │   │   │   ├── booking/
│   │   │   │   ├── calendar/
│   │   │   │   └── admin/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── professionals/
│   │   │   │   ├── services/
│   │   │   │   ├── geolocation/
│   │   │   │   ├── availability/
│   │   │   │   ├── bookings/
│   │   │   │   ├── reviews/
│   │   │   │   └── notifications/
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   ├── theme/
│   │   │   ├── utils/
│   │   │   └── types/
│   │   ├── android/
│   │   └── package.json
│   │
│   └── api/
│       ├── src/
│       │   ├── config/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── professionals/
│       │   │   ├── services/
│       │   │   ├── service-areas/
│       │   │   ├── availability/
│       │   │   ├── bookings/
│       │   │   ├── booking-slot-locks/
│       │   │   ├── reviews/
│       │   │   ├── notifications/
│       │   │   ├── verification/
│       │   │   └── administration/
│       │   ├── middlewares/
│       │   ├── database/
│       │   ├── jobs/
│       │   ├── integrations/
│       │   ├── shared/
│       │   ├── app.ts
│       │   └── server.ts
│       ├── tests/
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   ├── constants/
│       │   ├── validation/
│       │   └── contracts/
│       └── package.json
│
├── docs/
│   ├── requirements/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── tests/
│   └── decisions/
│
├── infra/
│   ├── deployment/
│   └── scripts/
│
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

### 20.1. Reglas de organización

- Separar componentes visuales de reglas de negocio.
- Mantener validaciones importantes también en backend.
- Compartir tipos y contratos cuando sea conveniente.
- No duplicar lógica de prevención de reservas en distintos clientes.
- Mantener los módulos de reserva y bloqueo de agenda como componentes centrales del backend.
- Utilizar variables de entorno para credenciales y direcciones de servicios.
- Documentar cualquier diferencia entre la estructura real y esta propuesta.

### 20.2. Consideración sobre un prototipo anterior

Si el repositorio actual contiene un prototipo Angular u otra implementación web previa, debe identificarse como código heredado antes de continuar. El documento de grado vigente describe Angular como alternativa evaluada y descartada y define React Native como base móvil, con una solución web compatible que debe verificarse. No se deben mezclar dependencias ni mantener dos clientes principales sin una decisión explícita de arquitectura.

---

# 21. Variables de entorno

Ejemplo de nombres; los valores reales nunca deben incluirse en el repositorio:

```env
NODE_ENV=development
API_PORT=3000
API_BASE_URL=http://localhost:3000/api
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ACCESS_TOKEN_EXPIRES_IN=
REFRESH_TOKEN_EXPIRES_IN=
WEB_ALLOWED_ORIGINS=
MAP_PROVIDER=
MAP_API_KEY=
FILE_STORAGE_PROVIDER=
FILE_STORAGE_BUCKET=
EMAIL_PROVIDER=
EMAIL_API_KEY=
PUSH_PROVIDER=
PUSH_CREDENTIALS=
DEFAULT_TIMEZONE=America/La_Paz
PILOT_SERVICE_AREA_ID=
BOOKING_SLOT_MINUTES=15
BOOKING_HOLD_MINUTES=15
```

Los nombres son una propuesta. Deben ajustarse a la biblioteca de configuración y al proveedor que se utilice. El archivo `.env` real debe estar excluido de Git y debe existir un `.env.example` sin secretos.

---

# 22. Pruebas y control de calidad

## 22.1. Tipos de prueba

- Unitarias: reglas de disponibilidad, cálculo de intervalos, permisos y transiciones de reserva.
- Integración: API con MongoDB y servicios externos simulados o configurados.
- Extremo a extremo: recorridos completos de cliente y profesional.
- Concurrencia: múltiples clientes intentando reservar simultáneamente.
- Seguridad: acceso por rol, validación, abuso de endpoints y protección de archivos.
- Rendimiento: búsquedas geoespaciales y operaciones comunes.
- Usabilidad: pruebas con usuarios del área piloto.
- Compatibilidad: navegadores modernos y dispositivos Android definidos.

## 22.2. Casos de prueba mínimos

| ID | Escenario | Resultado esperado |
|---|---|---|
| PT-01 | Registrar cliente con datos válidos. | Se crea cuenta con rol Cliente. |
| PT-02 | Registrar profesional con datos válidos. | Se crea cuenta y perfil con rol Profesional. |
| PT-03 | Intentar registrar el mismo correo dos veces. | El segundo registro se rechaza. |
| PT-04 | Iniciar sesión con contraseña incorrecta. | Se rechaza sin filtrar datos sensibles. |
| PT-05 | Intentar acceder a una ruta profesional desde una cuenta cliente. | El backend deniega la operación. |
| PT-06 | Registrar las cuatro categorías permitidas. | Se guardan las categorías válidas. |
| PT-07 | Intentar crear categoría no automotriz desde el formulario público. | Se rechaza. |
| PT-08 | Guardar ubicación de negocio en el mapa. | El perfil guarda coordenadas válidas y dirección. |
| PT-09 | Consultar profesionales con coordenadas conocidas. | Se devuelven resultados dentro del área y radio definidos. |
| PT-10 | Denegar permiso GPS del cliente. | Se permite introducir o seleccionar ubicación manual. |
| PT-11 | Buscar por subespecialidad. | Se muestran profesionales que ofrecen el servicio. |
| PT-12 | Consultar horario de un profesional. | Se muestran únicamente intervalos habilitados. |
| PT-13 | Crear un bloqueo de agenda. | La hora bloqueada deja de aparecer como disponible. |
| PT-14 | Reservar una franja libre. | Se crea solicitud y se retienen los bloques. |
| PT-15 | Dos clientes reservan exactamente la misma hora al mismo tiempo. | Solo una solicitud puede obtener el bloqueo; la otra recibe conflicto. |
| PT-16 | Dos clientes reservan intervalos parcialmente solapados. | El sistema impide el segundo intervalo incompatible. |
| PT-17 | Repetir el mismo POST por doble toque con la misma clave de idempotencia. | No se genera una segunda reserva. |
| PT-18 | Profesional acepta una solicitud pendiente. | Estado confirmado y bloqueos conservados. |
| PT-19 | Profesional rechaza una solicitud. | Estado rechazado y bloqueos liberados. |
| PT-20 | Dejar expirar una solicitud pendiente. | Estado expirado y bloqueos liberados. |
| PT-21 | Cancelar una reserva conforme a la política. | Estado actualizado, calendario sincronizado y bloqueos liberados. |
| PT-22 | Intentar calificar una reserva no finalizada. | La API rechaza la reseña. |
| PT-23 | Cliente califica profesional tras servicio finalizado. | Se registra una reseña válida. |
| PT-24 | Profesional califica cliente tras servicio finalizado. | Se registra una reseña válida independiente. |
| PT-25 | Repetir una reseña de la misma parte y reserva. | El sistema impide duplicarla. |
| PT-26 | Usuario no administrador intenta aprobar documentos. | La operación se deniega y se registra cuando corresponda. |
| PT-27 | Enviar aviso de confirmación con notificaciones configuradas. | Se entrega o se registra el error del proveedor. |
| PT-28 | Revisar calendario cerca de la fecha de una cita. | La tarjeta aumenta visualmente sin alterar horario ni disponibilidad. |
| PT-29 | Ejecutar búsquedas repetidas. | Se registran los tiempos y se comparan con las metas. |
| PT-30 | Completar flujos web y Android. | Los recorridos principales se completan en ambas plataformas. |
| PT-31 | Intentar consultar documento privado desde otra cuenta. | Se deniega el acceso. |
| PT-32 | Simular pérdida de conexión durante una reserva. | El cliente informa el estado y el reintento no duplica la reserva. |
| PT-33 | Consultar profesional fuera del polígono piloto. | No aparece en resultados del piloto. |
| PT-34 | Modificar la hora local del dispositivo. | La agenda sigue mostrando la hora correcta del área de servicio. |

## 22.3. Prueba crítica de concurrencia

La validación de doble reserva debe incluir una prueba automatizada en la que dos o más clientes envíen solicitudes en paralelo para bloques incompatibles del mismo profesional.

La condición de éxito no es que la pantalla oculte la hora después de una reserva, sino que la base de datos y el backend impidan efectivamente el segundo registro incompatible.

Se debe conservar evidencia de:

- Solicitudes enviadas.
- Marca de tiempo.
- Respuestas HTTP.
- Reserva creada.
- Bloqueos creados.
- Conflicto devuelto a los demás clientes.
- Estado final consistente de la agenda.

## 22.4. Indicadores propuestos

| Aspecto | Meta inicial | Verificación |
|---|---|---|
| Búsqueda | Menos de 3 segundos en el conjunto de pruebas definido. | Medir desde la petición hasta la respuesta de la API. |
| Operaciones simples | Menos de 1 segundo bajo condiciones normales. | Pruebas repetidas y registro de tiempos. |
| Disponibilidad | Objetivo del 99 % anual si el entorno permite medirlo. | Monitoreo del servicio. |
| Geolocalización | Coordenadas interpretadas como longitud-latitud y resultados correctos. | Casos con posiciones conocidas. |
| Seguridad | Usuarios sin permiso no ejecutan operaciones protegidas. | Pruebas de autorización. |
| Reservas | Cero doble reservas incompatibles en pruebas de concurrencia. | Pruebas simultáneas y revisión de base de datos. |
| Usabilidad | Los participantes completan las tareas principales. | Observación y encuesta breve. |

Las metas son criterios de evaluación propuestos; solo podrán declararse cumplidas después de medirlas.

---

# 23. Validación con usuarios y piloto

## 23.1. Área

Distrito 2 del municipio de Cercado, Cochabamba.

## 23.2. Grupo piloto de referencia

El documento de grado plantea una validación inicial aproximada de:

- 20 usuarios o clientes.
- 10 profesionales automotrices.

La cantidad es orientativa y debe ajustarse a la disponibilidad real de participantes.

## 23.3. Tareas a validar con clientes

- Crear cuenta.
- Encontrar su ubicación o seleccionar una manualmente.
- Buscar por especialidad.
- Identificar un profesional cercano.
- Revisar perfil y reputación.
- Consultar calendario.
- Solicitar una reserva.
- Comprender el estado de la solicitud.
- Cancelar conforme a las reglas.
- Calificar al profesional.

## 23.4. Tareas a validar con profesionales

- Crear cuenta profesional.
- Registrar negocio y ubicación.
- Seleccionar servicios y especialidades.
- Configurar horarios.
- Bloquear una fecha.
- Recibir y responder solicitudes.
- Consultar calendario.
- Finalizar un servicio.
- Calificar al cliente.

## 23.5. Criterios de evaluación

- Facilidad de registro.
- Claridad de las categorías.
- Precisión percibida del mapa.
- Facilidad para encontrar profesionales.
- Comprensión del calendario.
- Facilidad para reservar.
- Confianza en perfiles y reseñas.
- Comprensión de las notificaciones.
- Ausencia de reservas duplicadas.
- Rendimiento en conexiones móviles habituales.

---

# 24. Metodología de desarrollo: Scrumban

El desarrollo se organizará con metodología Scrumban y flujo continuo. No se deben presentar Sprints cerrados como requisito si la práctica aplicada es un flujo Kanban con revisiones periódicas.

## 24.1. Tablero

Columnas sugeridas:

1. Backlog.
2. Priorizado.
3. En desarrollo.
4. En revisión.
5. En pruebas.
6. Hecho.
7. Bloqueado, como estado identificable y no como una etapa que oculte los impedimentos.

## 24.2. Políticas de trabajo

- Cada tarjeta tendrá alcance y criterios de aceptación.
- Se iniciará una tarea cuando exista capacidad.
- Se mantendrá un límite de trabajo en curso.
- Los defectos se registrarán en el mismo tablero.
- Una tarea bloqueada deberá indicar causa y responsable de seguimiento.
- El incremento se revisará con la tutora o participantes disponibles.
- Se documentarán cambios importantes de arquitectura.

## 24.3. Incrementos recomendados

| Incremento | Contenido | Criterio de salida |
|---|---|---|
| 0. Preparación | Repositorio, herramientas, arquitectura, prototipos y requisitos. | Entorno reproducible y alcance aprobado. |
| 1. Usuarios | Registro cliente/profesional, login y roles. | Flujos completos y probados. |
| 2. Perfiles y catálogo | Negocio, categorías, subespecialidades y servicios. | Perfil profesional editable y público según estado. |
| 3. Geolocalización | Mapa, selección de ubicación y búsqueda por proximidad. | Resultados correctos dentro del polígono piloto. |
| 4. Horarios y calendario | Agenda semanal, bloqueos y megacalendario. | Disponibilidad consistente entre web, Android y API. |
| 5. Reservas | Solicitudes, aceptación, cancelación y bloqueo atómico. | Pruebas de concurrencia aprobadas. |
| 6. Reputación | Reseñas cliente-profesional y profesional-cliente. | Reseñas válidas vinculadas a reservas completadas. |
| 7. Administración | Verificación, moderación y auditoría. | Operaciones administrativas protegidas. |
| 8. Integración y validación | Notificaciones, pruebas, correcciones y piloto. | Informe de pruebas y versión piloto. |

---

# 25. Despliegue, mantenimiento y operación

## 25.1. Ambientes

Como mínimo:

- Desarrollo local.
- Pruebas o staging.
- Producción o piloto controlado.

Cada ambiente debe disponer de configuración y credenciales separadas.

## 25.2. Componentes de despliegue

- Cliente web publicado en un hosting compatible.
- Backend Node.js desplegado en un servidor o plataforma de aplicaciones.
- MongoDB administrado o instancia configurada con seguridad.
- Almacenamiento de archivos.
- Proveedor de mapas.
- Proveedor de push y correo, si se habilitan.
- Dominio y HTTPS para producción.
- Monitoreo de errores y disponibilidad.

## 25.3. Copias de seguridad

- Definir frecuencia de respaldo.
- Definir tiempo de conservación.
- Proteger los respaldos.
- Probar restauración.
- Documentar responsables y procedimiento.

## 25.4. Mantenimiento

- Actualizar dependencias.
- Corregir defectos.
- Revisar logs y métricas.
- Vigilar intentos de acceso indebido.
- Revisar el funcionamiento de proveedores externos.
- Mantener la documentación alineada con el código.
- Verificar periódicamente que la regla de no duplicación de horarios siga funcionando después de cambios.

---

# 26. Criterios globales de aceptación del MVP

El MVP podrá considerarse listo para el piloto cuando se cumpla todo lo siguiente:

- [ ] Un cliente puede registrarse, iniciar sesión y administrar su perfil.
- [ ] Un profesional puede registrarse con su recorrido separado.
- [ ] El profesional puede registrar nombre comercial, ubicación, categorías, subespecialidades y servicios.
- [ ] El profesional puede configurar horario, pausas y bloqueos.
- [ ] Solo existen las cuatro categorías automotrices autorizadas.
- [ ] El cliente puede buscar profesionales dentro del Distrito 2 configurado.
- [ ] El mapa muestra el punto azul del cliente cuando se concede permiso y marcadores por especialidad.
- [ ] El buscador ofrece una alternativa manual cuando no hay GPS.
- [ ] Los perfiles muestran servicios, horario, ubicación y reputación.
- [ ] El cliente puede consultar fechas y horarios libres en el calendario.
- [ ] El megacalendario destaca visualmente las citas próximas y funciona en web y Android.
- [ ] El cliente puede solicitar una reserva.
- [ ] El profesional puede aceptar o rechazar.
- [ ] No se pueden crear dos reservas incompatibles, incluso con solicitudes simultáneas.
- [ ] Los bloqueos se liberan correctamente cuando una solicitud se rechaza, cancela o expira.
- [ ] El historial refleja los estados correctos.
- [ ] Cliente y profesional pueden calificarse después de completar el servicio.
- [ ] No se pueden crear reseñas duplicadas ni reseñas para servicios no finalizados.
- [ ] El administrador puede revisar documentos y moderar perfiles.
- [ ] Los documentos privados no son accesibles por otros usuarios.
- [ ] Se muestran errores y estados de conectividad comprensibles.
- [ ] Se han ejecutado las pruebas funcionales, de permisos y de concurrencia.
- [ ] Se cuenta con una versión web y Android probada en sus entornos definidos.
- [ ] Existe documentación de instalación, configuración y ejecución.

---

# 27. Decisiones pendientes y elementos que se deben completar

Esta sección evita convertir supuestos en requisitos definitivos. Cada punto debe cerrarse y registrarse antes de depender de él en la implementación.

| ID | Decisión pendiente | Qué se debe confirmar |
|---|---|---|
| DP-01 | Imagen del megacalendario | Incorporar la captura o referencia visual que enviará el propietario y ajustar tamaños, colores, animaciones y jerarquía. |
| DP-02 | Límite geográfico del Distrito 2 | Obtener y validar el polígono territorial que utilizará el buscador. |
| DP-03 | Proveedor de mapas | Elegir biblioteca para Android y web, geocodificación, atribución y límites de uso. |
| DP-04 | Framework web real | Confirmar React Native Web o un cliente web independiente, y documentar pruebas de compatibilidad. |
| DP-05 | Framework del backend | Confirmar Express u otra solución Node.js según el repositorio actual. |
| DP-06 | Duración de cada servicio | Acordar duraciones y múltiplos de la unidad mínima de agenda. |
| DP-07 | Tiempo de retención | Definir cuánto tiempo queda bloqueada una solicitud pendiente antes de expirar. |
| DP-08 | Cancelación | Definir plazos, motivos y límites de cancelación para cliente y profesional. |
| DP-09 | Finalización del servicio | Definir quién puede marcar la reserva como completada y si requiere confirmación de ambas partes. |
| DP-10 | Reseña de cliente | Definir quién puede ver el promedio y comentarios asociados al cliente. |
| DP-11 | Verificación profesional | Definir documentos mínimos y proceso de aprobación, sin exponerlos públicamente. |
| DP-12 | Atención a domicilio | Confirmar si se habilitará en el MVP o si todas las reservas serán en el establecimiento. |
| DP-13 | Notificaciones | Confirmar proveedor de correo y push, costos y eventos habilitados. |
| DP-14 | Mensajería y favoritos | Confirmar si se incluyen en el piloto o pasan a una siguiente versión. |
| DP-15 | Integración con código existente | Revisar repositorio actual para adaptar esta estructura sin duplicar módulos o mezclar frameworks. |

---

# 28. Glosario

| Término | Significado en SkillFinder |
|---|---|
| Cliente | Usuario que busca y solicita un servicio automotriz. |
| Profesional | Usuario que ofrece servicios automotrices. |
| Categoría | Una de las cuatro especialidades principales del sistema. |
| Subespecialidad | Actividad concreta dentro de una categoría. |
| Perfil comercial | Información pública del negocio o lugar de atención. |
| Geolocalización | Uso de coordenadas para encontrar y representar lugares. |
| GeoJSON | Formato para representar datos geográficos. |
| `2dsphere` | Índice de MongoDB para consultas geoespaciales. |
| Disponibilidad | Intervalos que el profesional permite reservar. |
| Bloqueo de agenda | Intervalo que no puede reservarse. |
| Reserva | Solicitud de atención asociada a un profesional, servicio, fecha y hora. |
| Retención | Bloqueo temporal de horario mientras una solicitud espera respuesta. |
| Idempotencia | Propiedad que evita crear operaciones duplicadas al repetir la misma solicitud. |
| Conflicto `409` | Respuesta de API que indica que la solicitud entra en conflicto con el estado actual, por ejemplo una hora ya ocupada. |
| Megacalendario | Calendario central de disponibilidad y citas con énfasis visual dinámico en fechas próximas. |
| Reseña | Calificación y comentario asociados a una reserva finalizada. |
| Scrumban | Enfoque de desarrollo que combina flujo visual continuo, límites de trabajo en curso y revisión frecuente. |

---

# 29. Trazabilidad con el documento de grado

La presente especificación amplía y convierte en tareas de desarrollo los apartados del documento de grado:

- **Generalidades:** problema, objetivo, área de estudio, alcance y validación inicial.
- **Capítulo I:** geolocalización, plataformas de intermediación, reputación, experiencia de usuario, MongoDB, autenticación, notificaciones, calidad y consideraciones éticas.
- **Capítulo II:** Scrumban, requerimientos funcionales y no funcionales, actores, arquitectura, colecciones MongoDB, UML, API, seguridad, plan de pruebas, estructura de carpetas y despliegue.

Las decisiones propuestas en este MD no deben presentarse como funcionalidades ya implementadas. El estado real de cada requisito debe mantenerse en el tablero Scrumban y en la evidencia de pruebas.

---

# 30. Fuentes internas de este documento

1. **Documento de grado:** `SkillFinder_Perfil_UNIFRANZ_CARATULA_INDICES_REVISADOS (2)(1).docx`, especialmente el alcance del proyecto, Marco Teórico y Capítulo II: Ingeniería del Proyecto.
2. **Decisiones funcionales del proyecto:** alcance centrado en los cuatro servicios automotrices, búsqueda en Distrito 2 de Cercado, registro por rol, ubicación de negocio, calendario, reservas sin duplicación y evaluación de ambas partes.

Este archivo es una especificación viva. Debe actualizarse cuando se reciba la imagen del calendario, se revise el repositorio de código y se validen los detalles pendientes con la tutora y los participantes del piloto.
