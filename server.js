//ayuda documentacion https://www.passportjs.org/packages/  https://www.youtube.com/watch?app=desktop&v=Q0a0594tOrc

const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('./oauth.js');

const app = express();

app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

const port = 3000; //indico el puerto 3000
const mysql = require('mysql2'); //estamos usando mysql
const swaggerSetup = require('./swagger.js');
swaggerSetup(app);

const jwt = require("jsonwebtoken");
const falsoSecreto = "}.18|v6e>U~eU#'C~-48jNGdF}{O|*" // es ideal que esto NO esté en el codigo

const db = mysql.createConnection({
  host: 'localhost', /* '172.17.131.5' */
  user: 'Munch',
  password: 'Yucines',
  database: 'mydb',
});

app.use(express.json());//usaremos formato json

//google Oauth 2.0

app.get('/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
)
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  async (req, res) => {
    const fetch = (await import('node-fetch')).default;

    const data = {
      var1: 'valor1',//estos valores deberian ser algunas credenciales de la cuenta de google que guardar como usuario en la 
                    //bbdd y usar como el sub y el name para crear el token .
      var2: 'valor2',
    };

    try {
      const response = await fetch('http://localhost:3000/token', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('Error:', error);
      res.sendStatus(500);
    }
  }
);
app.get('/', (req, res) => {
  res.send('<a href ="/auth/google"> Autentificate con google</a>');
})
function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401);
}
app.get('/auth/failure', (req, res) => {
  res.send('Algo ha ido mal');
})
app.get('/success', isLoggedIn, (req, res) => {
  const { var1: sub, var2: name } = req.user;
  const token = jwt.sign({
    sub,
    name,
    exp: Math.floor(Date.now() / 1000) + 60
  },
    falsoSecreto//esto es la clave de encriptado
  );
  res.json({ message: 'Login successful', token });
  res.send(token);
})
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send('Error destroying session');
      }
      res.send('Goodbye!');
    });
  });
});
///////////////////////////////////////////////////////////////////////////////////////////
app.post("/token", (req, res) => { //creamos un endpoint para el token
  //aqui deberiamos recoger un usuario de la base de datos
  //solo si hay un usuario deberia recibir un token por ahora lo hardcodeo
  const { idUsuario: sub, userName: name } = { idUsuario: 1, userName: "Javi" };// lo renombro para que coincida con el payload

  const token = jwt.sign({
    sub,
    name,
    exp: Math.floor(Date.now() / 1000) + 60
  },
    falsoSecreto//esto es la clave de encriptado
  );
  res.send({ token });//lo enviamos como un objeto json
})

//middleware token
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];
  jwt.verify(token, falsoSecreto, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // Guarda el usuario en la solicitud
    next();
  });
}

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtiene todos los usuarios
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       500:
 *         description: Error al obtener usuarios
 */

app.get('/api/users', authenticateJWT, (req, res) => {
  db.query('SELECT * FROM usuarios', (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      res.status(500).json({ error: 'Error al obtener usuarios' });
    } else {
      res.json({ usuarios: results });
    }
  })
})

/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: Obtiene un usuario por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del usuario
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error al obtener usuario
 */

app.get("/api/user/:id", authenticateJWT, (req, res) => {
  const userId = req.params.id;
  db.query('SELECT * FROM usuarios where idUsuario = ?', [userId], (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      res.status(500).json({ error: 'Error al obtener usuarios' });
    } else {
      if (results.length === 0) {
        res.status(404).json({ message: 'Usuario no encontrado' })//404 quiere decir que no se ha devuelto nada
      }
      res.json({ usuario: results[0] });//el primer elemento porque vienen un un json con solo un elemento
    }
  })

})


/* {
    "userName": "JaviCopia",
    "userPassword": "password123",
    "fechaNacimiento": "2007-06-14",
    "wantPromo": 1
} */

/**
 * @swagger
 * /api/user:
 *   post:
 *     summary: Crea un nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *               userPassword:
 *                 type: string
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *               wantPromo:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Usuario creado con éxito
 *       500:
 *         description: Error al crear el usuario
 */

app.post('/api/user', authenticateJWT, (req, res) => {
  const newUser = req.body;
  db.query('INSERT INTO usuarios (userName, userPassword, fechaNacimiento, wantPromo) VALUES (?, ?, ?, ?)', [newUser.userName, newUser.userPassword, newUser.fechaNacimiento, newUser.wantPromo], (err, results) => {
    if (err) {
      console.error('Error al crear el usuario:', err);
      res.status(500).json({ error: 'Error al crear el usuario' });
    } else {
      res.json({ message: 'Usuario creado con éxito', usuario: newUser });
    }
  });
})

/* {
    "userName": "JaviCopiado",
    "userPassword": "password123",
    "fechaNacimiento": "2007-06-14",
    "urlImagen" : null,
    "urlBanner" : null,
    "wantPromo": 1
} */

/**
 * @swagger
 * /api/user/{id}:
 *   put:
 *     summary: Actualiza un usuario por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del usuario a actualizar
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 description: Nombre del usuario
 *               userPassword:
 *                 type: string
 *                 description: Contraseña del usuario
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *                 description: Fecha de nacimiento del usuario
 *               urlImagen:
 *                 type: string
 *                 nullable: true
 *                 description: URL de la imagen del usuario
 *               urlBanner:
 *                 type: string
 *                 nullable: true
 *                 description: URL del banner del usuario
 *               wantPromo:
 *                 type: integer
 *                 description: Indica si el usuario quiere promociones (1 para sí, 0 para no)
 *     responses:
 *       200:
 *         description: Usuario actualizado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     userName:
 *                       type: string
 *                     userPassword:
 *                       type: string
 *                     fechaNacimiento:
 *                       type: string
 *                       format: date
 *                     urlImagen:
 *                       type: string
 *                       nullable: true
 *                     urlBanner:
 *                       type: string
 *                       nullable: true
 *                     wantPromo:
 *                       type: integer
 *       400:
 *         description: Error de solicitud (por ejemplo, datos no válidos)
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error al actualizar el usuario
 */

app.put('/api/user/:id', authenticateJWT, (req, res) => {
  const userId = req.params.id;
  const updatedUser = req.body;
  db.query('UPDATE usuarios SET userName = ?, userPassword = ?, fechaNacimiento = ?, urlImagen = ?, urlBanner = ?, wantPromo = ? WHERE idUsuario = ?', [updatedUser.userName, updatedUser.userPassword, updatedUser.fechaNacimiento, updatedUser.urlImage, updatedUser.urlBanner, updatedUser.wantPromo, userId], (err, results) => {

    if (err) {
      console.error('Error al actualizar el usuario:', err);
      res.status(500).json({ error: 'Error al actualizar el usuario' });
    } else {
      res.json({ message: 'Usuario actualizado con exito', usuario: updatedUser });
    }
  });
})


/**
 * @swagger
 * /api/user/{id}:
 *   delete:
 *     summary: Elimina un usuario por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del usuario a eliminar
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario eliminado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error al eliminar el usuario
 */

app.delete('/api/user/:id', authenticateJWT, (req, res) => {
  const userId = req.params.id;
  db.query('DELETE FROM usuarios where idUsuario = ?', [userId], (err, results) => {
    if (err) {
      console.error('Error al eliminar el usuario:', err);
      res.status(500).json({ error: 'Error al eliminar usuarios' });
    } else {

      res.json({ message: 'Usuario eliminado con éxito' });
    }
  })
})




// peliculas//
/**
 * @swagger
 * /api/peliculas:
 *   get:
 *     summary: Obtiene todas las películas
 *     responses:
 *       200:
 *         description: Lista de películas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 peliculas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       idPelicula:
 *                         type: integer
 *                         description: ID de la película
 *                       nombrePelicula:
 *                         type: string
 *                         description: Nombre de la película
 *                       duracion:
 *                         type: integer
 *                         description: Duración de la película en minutos
 *                       fechaEstreno:
 *                         type: string
 *                         format: date
 *                         description: Fecha de estreno de la película
 *                       enEmision:
 *                         type: integer
 *                         description: Indica si la película está en emisión (1 para sí, 0 para no)
 *                       sinopsis:
 *                         type: string
 *                         description: Sinopsis de la película
 *       500:
 *         description: Error al obtener películas
 */

app.get('/api/peliculas', (req, res) => {
  db.query('SELECT * FROM peliculas', (err, results) => {
    if (err) {
      console.error('Error al obtener peliculas:', err);
      res.status(500).json({ error: 'Error al obtener peliculas' });
    } else {
      res.json({ peliculas: results });
    }
  });
});
/*
{
  "nombrePelicula": "Beetlejuice",
  "duracion": 104,
  "fechaEstreno": "2024-09-05",
  "enEmision": 1,
  "sinopsis": "Beetlejuice (Keaton), vuelve a ofrecer sus servicios como bioexorcista para ayudar a los fantasmas a echar de su casa a cualquier ser vivo que suponga una molestia. Con tan solo nombrarle tres veces, este personaje de inframundo, con pocos modales y mucha imaginación, se ofrece a ayudarte."
}
*/

/**
 * @swagger
 * /api/peliculas/{id}:
 *   get:
 *     summary: Obtiene una película por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la película que se desea obtener
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Película encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pelicula:
 *                   type: object
 *                   properties:
 *                     idPelicula:
 *                       type: integer
 *                       description: ID de la película
 *                     nombrePelicula:
 *                       type: string
 *                       description: Nombre de la película
 *                     duracion:
 *                       type: integer
 *                       description: Duración de la película en minutos
 *                     fechaEstreno:
 *                       type: string
 *                       format: date
 *                       description: Fecha de estreno de la película
 *                     enEmision:
 *                       type: integer
 *                       description: Indica si la película está en emisión (1 para sí, 0 para no)
 *                     sinopsis:
 *                       type: string
 *                       description: Sinopsis de la película
 *       404:
 *         description: Película no encontrada
 *       500:
 *         description: Error al obtener la película
 */
// Ruta para obtener una pelicula por su ID
app.get('/api/peliculas/:id', (req, res) => {
  const idPelicula = req.params.id;
  db.query('SELECT * FROM peliculas WHERE idPelicula = ?', [idPelicula], (err, results) => {
    if (err) {
      console.error('Error al obtener la pelicula:', err);
      res.status(500).json({ error: 'Error al obtener la pelicula' });
    } else {
      if (results.length === 0) {
        res.status(404).json({ message: 'Pelicula no encontrada' });
      } else {
        res.json({ user: results[0] });
      }
    }
  });
});

// Ruta para añadir una pelicula
/**
 * @swagger
 * /api/peliculas:
 *   post:
 *     summary: Crea una nueva película
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombrePelicula:
 *                 type: string
 *                 description: Nombre de la película
 *               duracion:
 *                 type: integer
 *                 description: Duración de la película en minutos
 *               fechaEstreno:
 *                 type: string
 *                 format: date
 *                 description: Fecha de estreno de la película
 *               enEmision:
 *                 type: integer
 *                 description: Indica si la película está en emisión (1 para sí, 0 para no)
 *               sinopsis:
 *                 type: string
 *                 description: Sinopsis de la película
 *     responses:
 *       201:
 *         description: Película añadida con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 pelicula:
 *                   type: object
 *                   properties:
 *                     nombrePelicula:
 *                       type: string
 *                     duracion:
 *                       type: integer
 *                     fechaEstreno:
 *                       type: string
 *                       format: date
 *                     enEmision:
 *                       type: integer
 *                     sinopsis:
 *                       type: string
 *       400:
 *         description: Error en la solicitud (por ejemplo, datos no válidos)
 *       500:
 *         description: Error al crear la película
 */

app.post('/api/peliculas', authenticateJWT, (req, res) => {

  const newPelicula = req.body;
  db.query('INSERT INTO peliculas (nombrePelicula, duracion, fechaEstreno, enEmision, sinopsis) VALUES (?, ?, ?, ?, ?)', [newPelicula.nombrePelicula, newPelicula.duracion, newPelicula.fechaEstreno, newPelicula.enEmision, newPelicula.sinopsis], (err, results) => {
    if (err) {
      console.error('Error al crear la pelicula:', err);
      res.status(500).json({ error: 'Error al crear la pelicula' });
    } else {
      res.json({ message: 'Pelicula añadida con exito', pelicula: newPelicula });
    }
  });
})


/**
 * @swagger
 * /api/peliculas/{id}:
 *   put:
 *     summary: Actualiza una película por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la película que se desea actualizar
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombrePelicula:
 *                 type: string
 *                 description: Nombre de la película
 *               duracion:
 *                 type: integer
 *                 description: Duración de la película en minutos
 *               fechaEstreno:
 *                 type: string
 *                 format: date
 *                 description: Fecha de estreno de la película
 *               enEmision:
 *                 type: integer
 *                 description: Indica si la película está en emisión (1 para sí, 0 para no)
 *               sinopsis:
 *                 type: string
 *                 description: Sinopsis de la película
 *     responses:
 *       200:
 *         description: Película actualizada con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 pelicula:
 *                   type: object
 *                   properties:
 *                     nombrePelicula:
 *                       type: string
 *                     duracion:
 *                       type: integer
 *                     fechaEstreno:
 *                       type: string
 *                       format: date
 *                     enEmision:
 *                       type: integer
 *                     sinopsis:
 *                       type: string
 *       400:
 *         description: Error en la solicitud (por ejemplo, datos no válidos)
 *       404:
 *         description: Película no encontrada
 *       500:
 *         description: Error al actualizar la película
 */
// Ruta para actualizar una pelicula por su ID
app.put('/api/peliculas/:id', authenticateJWT, (req, res) => {
  const idPelicula = req.params.id;
  const updatedPelicula = req.body;
  db.query('UPDATE peliculas SET nombrePelicula = ?, duracion = ?, fechaEstreno = ?, enEmision = ?, sinopsis = ? WHERE idPelicula = ?', [updatedPelicula.nombrePelicula, updatedPelicula.duracion, updatedPelicula.fechaEstreno, updatedPelicula.enEmision, updatedPelicula.sinopsis, idPelicula], (err, results) => {
    if (err) {
      console.error('Error al actualizar pelicula:', err);
      res.status(500).json({ error: 'Error al actualizar pelicula' });
    } else {
      res.json({ message: 'Pelicula actualizada con exito', pelicula: updatedPelicula });
    }
  });
})


/**
 * @swagger
 * /api/peliculas/{id}:
 *   delete:
 *     summary: Elimina una película por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la película que se desea eliminar
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Película eliminada con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Película no encontrada
 *       500:
 *         description: Error al eliminar la película
 */
// Ruta para eliminar una pelicula por su ID
app.delete('/api/peliculas/:id', authenticateJWT, (req, res) => {
  const idPelicula = req.params.id;
  db.query('DELETE FROM peliculas WHERE idPelicula = ?', [idPelicula], (err, results) => {
    if (err) {
      console.error('Error al eliminar pelicula:', err);
      res.status(500).json({ error: 'Error al eliminar la pelicula' });
    } else {
      res.json({ message: 'Pelicula eliminada con exito' });
    }
  });
})

// Inicia el servidor
app.listen(port, () => {
  console.log(`El servidor estÃ¡ escuchando en el puerto ${port}`);
});