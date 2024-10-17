/*
A req.session.cart a munkamenethez (session) kapcsolódik az Express.js alkalmazásban, és a felhasználó kosarának az adatait tárolja. 
Ez biztosítja, hogy a felhasználó böngészőjében való navigálás közben a kosár állapota megmaradjon 
(nem veszítjük el a kosár tartalmát oldalváltáskor vagy frissítéskor).


1. req.session:
A munkamenet (session) egy adatobjektum, amely a felhasználóra vonatkozó információkat tartalmazza az adott böngészési munkamenet során. 
Ezek az adatok a szerveren vannak tárolva, de általában egy session ID van mentve a felhasználó böngészőjébe egy süti (cookie) formájában.

Ahhoz, hogy ez működjön, szükség van egy munkamenetkezelő middleware-re, például az express-session modulra. 
Ez az objektum lehetőséget ad arra, hogy adatokat tároljunk a felhasználó munkamenetével kapcsolatban (például egy kosár állapotát).


2. req.session.cart:
A req.session.cart a munkamenet része, és egy kosarat reprezentálhat. 
Ez az objektum tartalmazhatja a felhasználó által hozzáadott termékeket, azok mennyiségét, árát stb.

Minden alkalommal, amikor egy felhasználó egy terméket hozzáad a kosárhoz, frissítjük ezt a cart objektumot, 
és a munkamenet él a következő kérésig (vagy amíg le nem jár).
*/
req.session.cart = {
    items: [
        { id: 1, name: "Termék A", quantity: 2, price: 100 },
        { id: 2, name: "Termék B", quantity: 1, price: 50 }
    ],
    totalQuantity: 3,
    totalPrice: 250
};
/*
Ebben a példában a cart objektum tartalmazza a kosárban lévő termékeket és azok adatait (pl. ID, név, mennyiség, ár), 
valamint egy összesített mennyiséget és árat.

Hogyan működik?
1. Kosár inicializálása: A kosarat általában akkor inicializáljuk, amikor a felhasználó először kezd valamit a kosárba tenni. Például:
*/
if (!req.session.cart) {
    req.session.cart = { items: [], totalQuantity: 0, totalPrice: 0 };
}
/*
2. Termék hozzáadása: Amikor egy új terméket adunk hozzá a kosárhoz, ezt a req.session.cart.items tömbbe fűzzük, 
és frissítjük az összesített mennyiséget és árat.

3. Munkamenet megőrzése: Amíg a felhasználó böngészik az oldalon, a req.session.cart változatlan marad, 
tehát az összes oldalon elérhető marad a felhasználó kosara.
*/

//1. Így csináljuk meg a session-t 
const express = require('express');
const session = require('express-session');
const app = express();

// Middleware pour traiter les données du formulaire
app.use(express.urlencoded({ extended: true }));

// Configuration de la session
app.use(session({
    secret: 'mon-secret-pour-la-session', // Une clé secrète pour signer la session
    resave: false, // Évite de réenregistrer la session si elle n'est pas modifiée
    saveUninitialized: true, // Sauvegarde la session même si elle est vide
    cookie: { secure: false } // false pour HTTP, true pour HTTPS
}));

app.listen(3000, () => {
    console.log('Serveur démarré sur le port 3000');
});

//2. post-os kérés 
app.post('/add-to-cart', (req, res) => {
    // Vérifier si le panier existe dans la session, sinon l'initialiser
    if (!req.session.cart) { //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        req.session.cart = { items: [], totalQuantity: 0, totalPrice: 0 };
    }

    // Obtenir les informations du produit à partir de la requête (req.body)
    const product = {
        id: req.body.id,
        name: req.body.name,
        price: parseFloat(req.body.price),
        quantity: parseInt(req.body.quantity)
    };

    // Ajouter le produit au panier
    req.session.cart.items.push(product);
    req.session.cart.totalQuantity += product.quantity;
    req.session.cart.totalPrice += product.price * product.quantity;

    // Retourner une réponse au client
    res.send('Produit ajouté au panier avec succès!');
});

//Így tudjuk megjeleníteni 
app.get('/cart', (req, res) => {
    if (!req.session.cart) {
        return res.send('Votre panier est vide.');
    }

    res.send(req.session.cart);
});
//így meg kiűríteni 
// Vider le panier
app.post('/clear-cart', (req, res) => {
    req.session.cart = { items: [], totalQuantity: 0, totalPrice: 0 };
    res.send('Le panier a été vidé.');
});

