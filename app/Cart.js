import nullOrUndefined from "./nullOrUndefined.js";
import conn from "./conn.js";
import nan from "./nan.js";

class Cart {
    _cart;
    _session;

    set cart(cart) {
        this._cart = !nullOrUndefined(cart) ? cart : [];
    }

    set session(session) {
        this._session = session;
    }

    findIndex(productID) {
        console.log(this._cart);
        return this._cart.findIndex(p=>p.productID === productID);
    }

    getProductData(productData) {
        const pData = {
            productID: parseInt(productData.productID),
            quantity: parseInt(productData.quantity),
            price: parseInt(productData.price),
            productName: productData.productName
        }

        return pData;
    }

    addProduct(productData) {
        productData = this.getProductData(productData);
        const index = this.findIndex(productData.productID);

        if(index === -1) {
            this._cart.push(productData);
        } else {
            this._cart[index].quantity += productData.quantity;
        }

        this._session.cart = this_cart;
    }

    deleteProduct(productID) {
        const index = this.findIndex(productID);

        if(index !== -1) 
            this._cart.splice(index, 1);

        this._session.cart = this_cart;
    }

    clear() {
        this._cart = [];
        this._session.cart = [];
    }
}

export default Cart;

/*
1. getProductData(productData) függvény:
Ez a függvény a kapott termékadatokat (productData) feldolgozza és egy új objektumot ad vissza, amely biztosítja, 
hogy a productID és a quantity számértékké legyenek alakítva (mert a beérkező adatok stringként érkezhetnek).

productID: parseInt(productData.productID): A termék azonosítóját egész számmá alakítjuk (parseInt segítségével).
quantity: parseInt(productData.quantity): A termék mennyiségét is egész számmá alakítjuk.
productName: productData.productName: A termék neve változatlanul marad, mert itt nincs szükség átalakításra.

A függvény végül egy pData nevű objektumot ad vissza, amely tartalmazza a termék azonosítóját, mennyiségét és nevét.

2. addProduct(productData) függvény:

Ez a függvény hozzáad egy új terméket a kosárhoz, vagy frissíti a már meglévő termék mennyiségét, ha az azonos termék már benne van.

productData = this.getProductData(productData): Meghívja a getProductData függvényt, hogy az adatokat a megfelelő formátumba alakítsa.

const index = this.findIndex(productData.productID): Megkeresi, hogy a kosárban (_cart tömb) található-e már a termék. 
Ha az azonosítóra (productID) nincs találat, az index értéke -1 lesz.

if(index === -1): Ha a termék még nincs a kosárban (azaz az index értéke -1), 
akkor a terméket hozzáadja a kosárhoz a this._cart.push(productData) segítségével.
else { this._cart[index].quantity += productData.quantity; }: Ha a termék már benne van a kosárban, 
frissíti a termék mennyiségét a this._cart[index].quantity értékének növelésével.

Összefoglalás:
A getProductData függvény biztosítja, hogy a termék adatai helyesen legyenek feldolgozva (pl. a mennyiség és azonosító számként).
Az addProduct függvény vagy hozzáadja az új terméket a kosárhoz, vagy frissíti a meglévő termék mennyiségét, ha már korábban hozzá lett adva.
*******************
_session változó meg, ahogy frissítjük az értékét -> c.session = req.session 
-> 
1. _session;
Ez egy privát tulajdonság a JavaScript osztályban (ahol ez a kód valószínűleg található). 
A szintaktika alapján a this._session tárolja az aktuális munkamenet (session) adatokat. 
Az alul definiált set metódussal tudjuk ezt beállítani.

2. set session(session)
Ez egy "setter" függvény, amelyet arra használunk, hogy beállítsuk a this._session értékét. 
Ha az osztályon belül a session tulajdonságot próbáljuk beállítani, ez a függvény meghívódik, 
és a this._session értéke az átadott session értékre módosul.

Például, amikor a c.session = req.session; sor fut le (lásd később), akkor ez a setter metódus kerül meghívásra.
c.cart = req.session.cart;: Itt az aktuális munkamenet (session) kosáradatai kerülnek hozzárendelésre a c.cart változóhoz 
(feltételezhetően egy osztály része, ahol c az osztály példánya). 
A req.session.cart a felhasználó munkamenetéhez kapcsolódó kosáradatokat tartalmazza.

c.session = req.session;: Ezzel a sorral a munkamenet adatait közvetlenül a c.session tulajdonsághoz rendeljük hozzá. 
A set session metódus meghívásra kerül, így a this._session értéke most a felhasználó aktuális munkamenete lesz.
    
*/