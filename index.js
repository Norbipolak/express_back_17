import express from "express";
import expressEjsLayouts from "express-ejs-layouts";
import UserHandler from "./app/userHandler,js"; 
import session from "express-session"
import successHTTP from "./app/successHTTP.js";
import Addresses from "./app/Addresses.js";
import getMessageAndSuccess from "./app/getMessageAndSuccess.js";
import checkPermission from "./app/checkPermission.js";
import checkAdminPermission from "./app/checkAdminPermission.js";
import ProductCategories from "./app/ProductCategories.js";
import nullOrUndefined from "./app/nullOrUndefined.js";
import fs from "fs";

const app = express();

app.set("view engine", "ejs");
app.use(expressEjsLayouts);
app.use(urlencoded({extended: true}));
app.use(express.static("assets"));
app.use(express.static("product-images"));

app.use(session());

app.use(session({
    secret: "asdf",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24*60*60*1000
    }
}));

const uh = new UserHandler();
const p = new Profile(); 
const a = new Addresses();
const pc = new ProductCategories();
const pr = new Products();
const c = new Cart();

app.get("/", (req, res)=> {
    res.render("public/index", 
        {
            layout: "layouts/public_layout", 
            title: "Kezdőlap", 
            baseUrl: process.env.BASE_URL,
            page:"index",
            message:req.query.message ? req.query.message : "",
            loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
        }
    );
});

app.get("/regisztracio", (req, res)=> {
    res.render("public/register", {
        layout:"./layouts/public_layout",
        title:"Regisztráció", 
        baseUrl: process.env.BASE_URL,
        page:"regisztracio",
        loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
    })
})

app.post("/regisztracio", async (req, res)=> {
    let response;
    try {
        response = await uh.register(req.body); 
    } catch (err) {
        response = err;
    }

    //response.success = response.status.toString(0) === "2";
    response.success = successHTTP(response.status);
    res.status(response.status);

    res.render("public/register_post", {
        layout: "./layout/public_layout",
        message: response.message,
        title: "Regisztráció",
        baseUrl: process.env.BASE_URL,
        page: "regisztracio", 
        success: response.success
    })
});

app.post("/login", async (req, res)=> {
    let response;
    let path;

    try{
        response = uh.login(req.body);
        req.session.userName = response.message.userName;
        req.session.userID = response.message.userID;
        req.session.isAdmin = response.message.isAdmin;

        path = response.message.isAdmin == 0 ? "/user/profil" : "/admin/profil"
    } catch(err) {
        response = err;
    }

    response.success = successHTTP(response.status);


    res.status(response.status).redirect(
        response.success ? path : `/bejelentkezes?message=${response.message[0]}`
    )

})

app.get("/bejelentkezes", (req, res)=> {
    res.render("public/login", {
        layout: "./layouts/public_layout",
        title: "Bejelentkezés",
        baseUrl: process.env.BASE_URL,
        page: "bejelentkezes",
        message: req.query.message ? req.query.message : "",
        loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
    })
});

app.get("/user/profil", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const profileData = await p.getProfile(req.session.userID);
        //const messages = req.query.messages.split(",");
        /*
            Mert a getProfile függvény vár egy id-t és az alapján lehozza az összes (*) adatot, ahhoz az id-ű rekordhoz 
        */
        //csináltunk egy segédfüggvényt
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("user/profile", {
            layout: "./layouts/user_layout",
            title: "Profil Szerkesztése",
            baseUrl: process.env.BASE_URL,
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil", 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.post("/user/profil", async (req, res)=> {
    let response;

    try {
        const user = req.body;
        user.userID = req.session.userID;
        response = await p.updateProfile(user);
    } catch(err) {
        response = err;
    }

    console.log(response);

        
    const success = successHTTP(response.status);
    res.redirect(`/user/profil?success=${success}&messages=${response.message}`);
});

app.get("/user/cim-letrehozasa", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const addressTypes = await a.getAddressTypes();
        const messageAndSuccess = getMessageAndSuccess(req.query);
    
        res.render("user/create_address", {
            layout: "./layouts/user_layout", 
            title: "Címek létrehozása", 
            page: "címek",
            addressTypes: addressTypes,
            baseUrl: process.env.BASE_URL,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            address:{}
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    } 
   
});

app.post("/user/create_address", async (req, res)=> {
    //itt szedjük majd le az adatokat 
    let response;

    try {
        response = await a.createAddress(req.body, req.session.userID);
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.status);

    if(success) {
        res.status(response.status).redirect(`/user/cim-letrehozasa/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.status(response.status).redirect(`/user/cim-letrehozasa?message=${response.message}&success=${success}`);
    }
    
});

app.get("/user/cim-letrehozasa:addressID", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const addressTypes = await a.getAddressTypes();
        const messageAndSuccess = getMessageAndSuccess(req.query);
        const address = await a.getAddressByID(req.params.addressID, req.session.userID);
        console.log(address);
    
        res.render("user/create_address", {
            layout: "./layouts/user_layout", 
            title: "Címek létrehozása", 
            baseUrl: process.env.BASE_URL,
            page: "címek",
            addressTypes: addressTypes,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            address:address
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    } 
});

app.get("/user/címek", async (req, res)=> {
    let response;

    try {
        checkPermission(req.session.userID),
        response = await a.getAddressesByUser(req.session.userID);
    } catch(err) {
        if(err.status === 403) {
            res.redirect(`/message=${err.message}`);
        }
        response = err;
    }

    res.render("user/addresses", { 
        layout: ".layout/user_layout",
        addresses: response.message,
        baseUrl: process.env.BASE_URL,
        title: "Címek", 
        page: "címek"
    })
});

app.post("user/create-address/:addressID", async (req, res)=> {
    let response;

    try {
        const address = req.body;
        address.addressID = req.params.addressID;
        response = await a.updateAddress(address, req.session.userID);
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    res.redirect(`/user/cim-letrehozasa/${req.params.addressID}?message=${response.message}&success=${success}`);
    /*
        fontos, hogy azokat ami egy url változó query, azt ?xx=xx formátumba kell csinálni   
    */
})

app.get("/admin/profil", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );
        const profileData = await p.getProfile(req.session.userID);
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/profile", {
            layout: "./layouts/admin_layout",
            title: "Profil Szerkesztése",
            baseUrl: process.env.BASE_URL,
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil", 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.get("/admin/felhasznalok", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const users = await uh.search(
            req.session.userID,
            req.session.isAdmin
        )
        
        res.render("admin/users", {
            layout: "./layouts/admin_layout",
            title: "Felhasználok",
            baseUrl: process.env.BASE_URL,
            profileData: users.message,
            page: "felhasznalok", 
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.get("/admin/termek-kategoriak", async (req, res)=> {
    try {
        // checkAdminPermission(
        //     req.session.userID,
        //     req.session.isAdmin
        // );

        const categories = await pc.getProductCategories(
            // req.session.userID,
            // req.session.isAdmin
        )
        
        res.render("admin/product-categories", {
            layout: "./layouts/admin_layout",
            title: "Termék kategóriák",
            baseUrl: process.env.BASE_URL,
            categories: categories,
            page: "termek-kategoriak"
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.get("/admin/termek-kategoria", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/product-category", {
            layout: "./layouts/admin_layout",
            title: "Termék kategória",
            baseUrl: process.env.BASE_URL,
            page: "termek-kategoria", 
            categoryData: null,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.post("admin/create-category", async (req, res)=> {
    let response;

    try {
        response = await pc.createCategory(
            req.body,
            req.session.userID,
            req.session.isAdmin
        )
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    if(success) {
        res.redirect(`/admin/termek-kategoria/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.redirect(`/admin/termek-kategoria/?message=${response.message}&success=${success}`);
    }
});

app.get("/admin/termek-kategoria/:categoryID", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const categoryData = await pc.getCategoryByID(req.params.categoryID);
        /*
            fontos, hogy itt ha response [0][0], akkor azt az egyet kapjuk meg, ami nekünk kell 
            async getCategoryByID(categoryID) {
                 try {
                    const response = await conn.promise().query(
                    "SELECT * FROM product_categories WHERE categoryID = ?"
                    [categoryID]
                    );
                return response[0][0];                        *****
        */

        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/product-category", {
            layout: "./layouts/admin_layout",
            title: "Termék kategória",
            baseUrl: process.env.BASE_URL,
            page: "termek-kategoria", 
            categoryData:categoryData, 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.post("admin/create-category/:categoryID", async (req, res)=> {
    let response;

    try {

        const categoryData = req.body;
        categoryData.categoryID = req.params.categoryID;
        response = await pc.updateCategory(
            categoryData,
            req.session.userID,
            req.session.isAdmin
        )
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    // if(success) {
    //     res.redirect(`/admin/termek-kategoria/${response.insertID}?message=${response.message}&success=${success}`);
    // } else {
    //     res.redirect(`/admin/termek-kategoria/?message=${response.message}&success=${success}`);
    // }
    //itt nem úgy fogunk eljárni, mert nem response.insertID, hanem req.params.category, ahonnan meg van a szám!! 

    res.redirect(`/admin/termek-kategoria/${req.params.categoryID}/?message=${response.message}&success=${success}`);
});

app.post("/admin/delete-category/:categoryID", async (req, res)=> {
    let response;

    try {
        response = await pc.deleteCategory(
            req.params.categoryID,
            req.session.userID,
            req.session.isAdmin
        );
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    res.redirect(`/admin/termek-kategoriak/?message=${response.message}&success=${success}`);
});

//fontos, hogy nincsen még példányunk a Product-ból -> const pr = new Products();
app.get("/admin/termek", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );
    
        /*
            Itt nekünk kell a productCategory
            Ez nagyon fontos, mert ha nincs itt productCategory, akkor nem tudjuk kiválasztani a termék kategóriákat, ilyen legördülősben 
            -> 
        */
        const categories = await pc.getProductCategories()
        /*
            majd amit itt megkapunk termék kategóriákat, azokat át kell adni a render-nek, mert ott majd egy forEach-vel végig kell menni rajtuk!!
        */
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/product", {
            layout: "./layouts/admin_layout",
            title: "Termék létrehozása",
            baseUrl: process.env.BASE_URL,
            page: "termek", 
            categories: categories,           //***
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            productData: null         
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.post("/admin/create-product", async (req, res)=> {
    let response;

    try {
        response = await pr.createProduct(
            req.body,
            req.session.userID,
            req.session.isAdmin
        );
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    if(success) {
        res.redirect(`/admin/termek/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.redirect(`/admin/termek?message=${response.message}&success=${success}`);
    }
});

app.get("/admin/termek/:productID", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );

        const categories = await pc.getProductCategories()
        const messageAndSuccess = getMessageAndSuccess(req.query);
        const productData = await pr.getProductByID(req.params.productID);

        res.render("admin/product", {
            layout: "./layouts/admin_layout",
            title: "Termék létrehozása",
            baseUrl: process.env.BASE_URL,
            page: "termek", 
            categories: categories, 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success, 
            productData: productData          
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.post("/admin/create-product/:productID", async (req, res)=> {
    let response;

    try {
        req.body.productID = req.params.productID;
        //hogy a body-ban legyen benne a productID is! 
        response = await pr.updateProduct(
            req.body,
            req.session.userID,
            req.session.isAdmin
        );
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.success);
    res.redirect(`/admin/termek/${req.params.productID}?message=${response.message}&success=${success}`);
});

app.get("/admin/termekek", async (req, res)=> {
    try {
        checkAdminPermission(
            req.session.userID,
            req.session.isAdmin
        );
    
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const products = await pr.getProducts(page);
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("admin/products", {
            layout: "./layouts/admin_layout",
            title: "Termékek",
            baseUrl: process.env.BASE_URL,
            page: "termekek",            
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            products: products,
            page:page
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.post("/admin-upload-product-image/:productID", async (req, res) => {
    const form = formidable({allowEmptyFiles: true, minFileSize:0});
    let fields;
    let files;

    form.uploadDir = "./product-images";
    form.keepExtension = true;

    try {
        [fields, files] = await form.parse(req);
        if(files.productImage[0].size === 0) {
            throw {
                status: 400,
                message: ["Nem csatoltál fájlt a kéréshez!"]
            }
        }

        await pr.deleteProductImage(
            req.params.productID, 
            req.session.userID, 
            req.session.isAdmin
        );

        const oldPath = files.productImage[0].filepath;
        const newPath = form.uploadDir + "/" + files.productImage[0].originalFileName;

        
        await fs.promises.rename(oldPath, newPath);


        await pr.updateFilePath(
            req.params.productID, 
            files.productImage[0].originalFileName, 
            req.session.userID, req.session.isAdmin
        );


        res.redirect(`/admin/termekek/${req.params.productID}`);

    } catch(err) {
        console.log(err);
        const message = err.message || ["A fájl feltöltése sikertelen!"];
        
        res.status(err.status || 400).redirect(`/admin/termekek/${req.params.productID}?message=${message}&success=false`);
    }
});

app.post("/admin/delete-product-image/:productID", async (req, res) => {

    try {
        const deleteMsg = await pr.deleteProductImage(req.params.productID, req.session.userID, req.session.isAdmin, true);

        await pr.updateFilePath
        (
            req.params.productID, 
            null, 
            req.session.userID, 
            req.session.isAdmin
        );

        const msg = deleteMsg || ["Sikeres feltöltés!"];

        res.redirect(`/admin/termek/${req.params.productID}?message=${msg}&success=true`);

    } catch (err) {
        res.status(err.status).redirect(`/admin/termek/${req.params.productID}?message=${err.message}&success=false`);
    }
});

app.get("/logout", (req, res)=> {
    req.session.userID = null;
    req.session.isAdmin = null;

    res.redirect("/");
});

app.get("/termekek", async (req, res)=> {
    try {
        // checkAdminPermission(
        //     req.session.userID,
        //     req.session.isAdmin
        // ); 
    
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const products = await pr.getProducts(page);
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        //res.render("admin/products", { itt majd public mappából jelenítjük meg a products.ejs-ünket 
        res.render("public/products", {
            //layout: "./layouts/admin_layout",
            layout: "./layouts/public_layout",
            title: "Termékek",
            baseUrl: process.env.BASE_URL,
            page: "termekek",            
            message: messageAndSuccess.message,
            success: messageAndSuccess.success,
            products: products,
            page:page,
            // loggedIn-et majd itt meg kell adni, mert ez várja a public_layout 
            loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin

        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.get("/termek/:productID", async (req,res)=> {
    try {
        // checkAdminPermission(
        //     req.session.userID,
        //     req.session.isAdmin
        // );

        //const categories = await pc.getProductCategories()
        const messageAndSuccess = getMessageAndSuccess(req.query);
        const productData = await pr.getProductByID(req.params.productID);

        //res.render("admin/product", {
        res.render("public/product", {
            //layout: "./layouts/admin_layout",
            layout: "./layouts/public_layout",
            title: "Termékadatok",
            baseUrl: process.env.BASE_URL,
            page: "termekadatok", 
            //categories: categories, categories nem kell, mert egy lekérdezésben leszedtük egy inner join-van a categoryName-ket!! 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success, 
            productData: productData, 
            loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.post("/add-to-cart", (req, res)=> {
    let response;

    try {
        c.cart = req.session.cart;
        c.session = req.session;
        c.addProduct(req.body);
    } catch(err) {

    }

    res.redirect(`/termek/${req.body.productID}`);
});

app.get("/kosar", async (req, res)=> {
    const messageAndSuccess = getMessageAndSuccess(req.query);

    try {
        res.render("public/cart", {
            layout: "./layouts/public_layout",
            title: "Kosár",
            baseUrl: process.env.BASE_URL,
            page: "kosar", 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success, 
            cart:req.session.cart, 
            loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
        })
    } catch(err) {
        console.log(err);
        res.redirect(`/?message=${err.message}`);
    }
});

app.post("/remove-cart-product:productID", (req, res)=> {
    let response;

    try {
        c.cart = req.session.cart;
        c.session = req.session;
        c.deleteProduct(parseInt(req.params.productID));
        /*
        ez csak az id-t várja a többi adatot nem, de viszont parseInt-elni kell itt
        és nagyon fontos, hogy nem req.body hanem req.params, mert ezt a url-ben küldjük el 
        action="<%=baseUrl%>/remove-cart-product/<%=c.productID%>">
        */
    } catch(err) {

    }

    res.redirect(`/kosar`);
});


app.listen(3000, console.log("the app is listening on localhost:3000"));

/*
    Ott tartunk, hogy a termekek-nél megjelennek a termékek (localhost:3000/termekek)
    És ott tudunk lapozni is mert megcsináltuk a pagination-t és benne lesz az url-ben egy page változó így 
    -> localhost:3000/termekek?page=1 meg 2,3,4,5

    Van egy olyan gomb, hogy megnyitás vagy ha képre kattintunk, akkor is továbbmegyünk ide 
    ->
    localhost:3000/termek/44 vagy amennyi a productID 
    És akkor megjelenik a termék, jobb oldalon a kép bal oldalon meg ilyen dolgok, hogy terméknév, ár stb...
    És itt van egy input number, ahol be tudjuk állítani, hogy mennyit akarunk vásárolni meg egy Kosárba button 
    -> 
    <form method="post" action="<%=baseUrl/add-to-cart%>"
    class="grid-2" style="margin-top: 25px;">
        <div>
            <input type="number" value="1" name="quantity">
            <input type="hidden" name="productID" value="<%=productData.productID%>">
        </div>
        <div>
            <button>Kosárba</button>
        </div>
    </form>
    Itt még van egy hidden input is, aminek az a value-ja, hogy productID, tehát a form beküldésekor ezt is megszerezzük, de viszont ez az input 
    nem látható az oldalon 

    És a kosárba gombbal kell betteni a terméket a kosárba, erre van a cart a Cart.js-ben 
    ->
    class Cart {
    _cart;

    set cart(cart) {
        this._cart = !nullOrUndefined(cart) ? cart : [];
    }...
    Itt van még egy add és egy deleteProduct 
    Itt lesz egy olyan függvény, hogy order, utána meg megcsináljuk, hogy minden látszódjon a cart-ban 
    Elöször megcsináljuk a cart-ot és utána a megrendelést 

    *************
    Ha megnyomjuk a kosárba gombot, akkor ide visz minket -> <form method="post" action="<%=baseUrl/add-to-cart%>"
    localhost:3000/add-to-cart 
    Az add-to-cart meg kell, hogy kapja a terméknek az id-ját 
    1. Ezt úgy lehet, ahogy csináltuk, hogy visszaadjuk egy input-val -> <input type="hidden" name="productID" value="<%=productData.productID%>">

    2. Vagy a másik megoldás, hogy az url-be berakjuk productData.productID-t 
    ->
        <form method="post" action="<%=baseUrl/add-to-cart%<%=productData.productID**********%>>"
        class="grid-2" style="margin-top: 25px;">

    Így benne lesz a productID az URL-ben (ha rákattintunk a kosárba gombra) -> 
    localhost:3000/termek/86 (gombra kattintás) localhost:3000/add-to-cart/86
    Itt megkapjuk a 86-os termékid-t 
    Itt az index-en meg létrehozunk egy post-os endpoint-ot ennek 
    -> 
    app.post("/add-to-cart/:productID", (req, res)=> {
    És ez nem is muszály, hogy async legyen, mert a Cart.js-ben eddig semmi sem async, csak majd az order lesz az, mert ott használunk 
    adatbáziskapcsolatot 

    Erről a Cart-ról nincs is példányunk, tehát ha itt az index-en akarunk majd meghívni onnan valamit, akkor példányosítani kell 
    -> 
    const c = new Cart();
    és try-ban megívjuk az addProduct-ot 
    try {
        response = c.addProduct();

    Mégse azt választjuk, hogy URL-be adjuk vissza az adatokat 
    <form method="post" action="<%=baseUrl/add-to-cart%<%=productData.productID%>>"
    hanem egy input-ban -> <input type="hidden" name="productID" value="<%=productData.productID%>">
    Csak egy post-nál jobb így, hogy a productID-it is post(body-ban) fogjuk beküldeni 

    Akkor ezek nem is kellenek ide action="<%=baseUrl/add-to-cart%<%=productData.productID%>>" -> <form method="post" action="<%=baseUrl/add-to-cart%>"
    meg 
    app.post("/add-to-cart/:productID", (req, res)=> {  ->  app.post("/add-to-cart", (req, res)=> {

    És akkor csak azt fogjuk átadni az addProduct-nak, hogy req.body, mert abban van egy quantity meg egy productID is ami kell 
    -> 
    try {
        response = c.addProduct(req.body);

    És most visszaíráníítunk a termék-re, de ez majd nem így lesz -> res.redirect(`/termek/${req.body.productID}`);
    ->
    app.post("/add-to-cart", (req, res)=> {
    let response;

    try {
        response = c.addProduct(req.body);
    } catch(err) {

    }

    res.redirect(`/termek/${req.body.productID}`);
});

    És nem is kell, hogy az addProduct-ot, amikor meghívjuk el legyen mentve egy response-ba, mert az addProduct-val nem adunk vissza semmit
    De viszont azt kell megnézni, hogy mi lesz ezután a this._cart-ban, hogy belekerül ez az árú (product)
    -> 
    addProduct(productData) {
    console.log(productData)
        const index = this.findIndex(productData.productID);

        if(index === -1) {
            this._cart.push(productData);
        } else {
            this._cart[index].quantity += productData.quantity;
        }

        console.log(this._cart);  ****
    }

    Ez van a productData-ban ami bejön, hogy ->
    { quantity: '3', productID: '20' } 
    És mivel itt ez egy string és nekünk a findIndex-hez parseInt-elni kell, mert nem az kell, hogy '20' hanem, hogy 20
        különben nem találná meg 
    ->
    const index = this.findIndex(productData.productID);   ->    const index = this.findIndex(parseInt***(productData.productID));
    meg hasonlóan, amikor hozzáadjuk a quantity-t is ott is parseInt()-elni kell 
    ->
    if(index === -1) {
        this._cart.push(productData);
    } else {
        this._cart[index].quantity += ******parseInt(productData.quantity);
    }
    mert így kapjuk meg a productData-t -> { quantity: '3', productID: '20' } 

    De ami nagyon fontos, hogy így még semmi nem lesz a _cart-ban, mert az set-elni kell!!!!!! 
    findIndex(productID) {
        console.log(this._cart); ****** undefined
        return this._cart.findIndex(p=>p.productID === productID);
    }

    És itt a post-osban a cart-ot set-elni, kell de ezt nem tudjuk elérni, hogy _cart, ezért csináltuk neki a set-ert 
    ->
        set cart(cart) {
        this._cart = !nullOrUndefined(cart) ? cart : [];
    }

    app.post("/add-to-cart", (req, res)=> {
    let response;

    try {
        c.cart = req.session.cart;    ******
        c.addProduct(req.body);
    } catch(err) {
    
    És ha ez megvan, akkor meg ez lesz a _cart-ban ha beküldtük, megnyomtuk a kosárba gombot 
    -> 
        addProduct(productData) {
        const index = this.findIndex(parseInt(productData.productID));

        if(index === -1) {
            this._cart.push(productData);
        } else {
            this._cart[index].quantity += parseInt(productData.quantity);
        }

    console.log(this._cart); *****
    [ {quantity: '1', productID: '48' } ]
    Azért nem lesz jó a dolog, mert string-ben van és ez problémát fog okozni -> parseInt-elni kell
    ezt két helyen lehet megtenni
    c.addProduct(req.body); és akkor már úgy fogja megkapni az addProduct 
    vagy Cart.js-ben 
    De még a product.ejs-ben nem csak a quantity-t meg a productID fogjuk elküldeni, hanem kell még a productName meg hasonlók
    <form method="post" action="<%=baseUrl/add-to-cart%>"
    class="grid-2" style="margin-top: 25px;">
        <div>
            <input type="number" value="1" name="quantity">
            <input type="hidden" name="productID" value="<%=productData.productID%>">
            <input type="hidden" name="productName" value="<%=productData.productName%>">  *******
        </div>
        <div>
            <button>Kosárba</button>
        </div>
    </form>
    Legalább ennyi adatot, hogy majd ki tudjuk írni 
    Cart.js-ben megcsináljuk a parse-olást lesz egy ilyen függvény, hogy getProductData
    -> 
    getProductData(productData) {
        const pData = {
            productID: parseInt(productData.productID),
            quantity: parseInt(productData.quantity),
            productName: productData.productName
        }

        return pData;
    }
    Mert, akkor az addProduct-nak át tudjuk ezt adni, meghívni és amit vár productdData-t az ilyen formában lesz 
    -> 
    és akkor már nem itt kell parseInt-elni hanem úgy fogja megkapni a dolgokat 
        addProduct(productData) {
        productData = this.getProductData(productData); **************
        const index = this.findIndex(productData.productID);******** nem kell parseInt-elni

        if(index === -1) {
            this._cart.push(productData);  ****** nem kell parseInt-elni
        } else {
            this._cart[index].quantity += productData.quantity;******** nem kell parseInt-elni
        }
    ****************
    Most az a probléma, hogyha több terméket rakunk kosárba
    ->
    console.log(this._cart);
    [ {quantity: '1', productID: '48', productName: 'valami' }]
    [ {quantity: '1', productID: '56', productName: 'valami2' }]
    Olyan mintha mindig kiürítené a kosarat és utána rakná bele a következő dolgot 

    És az a kérdés, hogy miért, amikor itt beletesszük a dolgokat a session-be 
    ->
    app.post("/add-to-cart", (req, res)=> {
    try {
        c.cart = req.session.cart;  ******
        c.addProduct(req.body);
    Itt az az érdekes, hogy a req.session.cart-ot adjuk át és a req.session-nek pedig frissítenie kellene a cart-ot 
    Hogyan tudjuk ezt megoldani a legjobban
        Mert a req.session.cart az egy sima objektum és hogyha valamit belerakunk a cart-ba, akkor azt a session-ben is kellene nekünk frissíteni 

    Viszont itt nincsen meg nekünk a session-ünk 
    De meg tudjuk azt csinálni, hogy a Cart.js-en lesz egy _session és annak csinálunk egy set-tert és akkor az add-be meg ahol változás 
    történik ott mindig visszadobáljuk a _cart-ot automatikusan 
    Vagy azt is meg tudjuk csinálni, hogy az addProduct visszaadja a this._cart-ot és kivül itt az index-en oldjuk meg ezt a dolgot a try-ban
    -> 
    1. Tehát visszaadjuk a _cart-ot az addProducts-nál és ezt frissítejük a req.session.cart-ot, amit visszaad a c.addProduct(req.body)
    2. megoldás, hogy lesz egy olyan változó, mint a _cart csak _session, annak egy set-tere és ezt minden egyes alkalommal beállítjuk 
    és akkor az addProduct függvénnyel belül frissítjük a session értéket 

    A második megoldást fogjuk csinálni 
    class Cart {
    _cart;
    _session;       ***************

    set cart(cart) {
        this._cart = !nullOrUndefined(cart) ? cart : [];
    }

    set session(session) {    *************
        this._session = session;
    }

    Mivel, hogy nem csinálunk mindig új példányt a Cart-ból, ezért itt ezt tudjuk írni 
    ->
    c.session = req.session;
    Tehát itt megadjuk, hogy a session változó, amit létrehoztunk a Cart-ban az a req.session legyen 

    És mindig azt kell csinálni, miután a módosítás megtörténik az addProduct-ban 
        addProduct(productData) {
        productData = this.getProductData(productData);
        const index = this.findIndex(productData.productID);

        if(index === -1) {
            this._cart.push(productData);
        } else {
            this._cart[index].quantity += productData.quantity;
        }

        console.log(_cart);

        this._session.cart = this_cart;  ******
    }
    
    és a deleteProduct-ban meg ugyanezt 
    -> 
        deleteProduct(productID) {
        const index = this.findIndex(productID);

        if(index !== -1) 
            this._cart.splice(index, 1);

        this._session.cart = this_cart;  ***********
    }
    Hogy a session-ben is változzón az érték, hogyha a cart-ban is!!! 

    console.log(_cart);
    Ha most kiválasztunk kettőt valamelyik termékből 
    ->
    [ {quantity: '2', productID: '56', productName: 'Motorola W233 Renew' } ]

    És ha kiválasztunk egy másik terméket, akkor is berakja 
    -> 
    [ 
        {quantity: '2', productID: '56', productName: 'Motorola W233 Renew' },
        {quantity: '2', productID: '69', productName: 'Sony Xperia TX' }
    ]
    és benne van 
    De viszont ha most megnyomjuk még 2-szer a Sony Xperia TX-et, akkor így rakja bele 
    ->
        [ 
        {quantity: '2', productID: '56', productName: 'Motorola W233 Renew' },
        {quantity: '4', productID: '69', productName: 'Sony Xperia TX' },

    És így is jól müködött, mert nem tette bele újból, hanem csak hozzáadta a quantity-t 
    Egy productID az csak egyszer szerepel!! 
**************************************************
Kell egy olyat csinálni, hogy clear a Cart.js-ban, hogy kiűrítsük az egész kosarunkat!!! 
    clear() {
        this._cart = [];
        this._session.cart = [];
    }
Itt fontos, hogy ne csak a cart-ot, hanem a session.cart-ot is ki kell űríteni 
*****************
Most azt kell megoldani, hogy legyen egy kosár oldal és minden terméknél legyen egy olyan link, hogy tovább a kosárra 
- Elöször is kell csinálni egy linket (a) a product-ra, ami tovább visz minket (a form alatt)
-> 
    <a href="<%=baseUrl%>/kosar">
        <button>Tovább a kosárra</button>
    </a>

    De még nincsen ilyen (get-es), hogy localhost:3000/kosar
    Kell csinálni egy ejs oldalt -> public-ban cart.ejs 

    Majd itt a mennyiséget növelni kell tudni meg csökkenteni is, hogy még a vásárló ezt itt meg tudja oldani mielött továbbmegy 
            <thead>
            <tr>
                <td>Terméknév</td>
                <td>Mennyiség</td>******
                <td>Ár</td>
                <td>Részösszeg</td>
            </tr>
        </thead>
    Tbody az végigmegy a session-önk, tehát a cart-nak az adatain!!! 
    de elötte megcsináljuk a css-et 
    <div class="container">
        <h1>Kosár</h1>
        <table class="cart-table">

    .cart-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid grey;
        text-align: center;
    }

    .cart-table td, .cart-table th {
        padding: 4px;
        border: 1px solid grey;
    }

    .cart-table thead {
        background-color: #b3b3b3;
        color: white;
    }

    .cart-table tbody:nth-child(2n) {
        background-color: #123456;
        color: white;
    }

    Get-es kérés
    app.get("/kosar", async (req, res)=> {
    const messageAndSuccess = getMessageAndSuccess(req.query);

    try {
        res.render("public/cart", {
            layout: "./layouts/public_layout",
            title: "Kosár",
            baseUrl: process.env.BASE_URL,
            page: "kosar", 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success, 
            cart:req.session.cart, *****************
            loggedIn: nullOrUndefined(req.session.isAdmin) ? -1 : req.session.isAdmin
        })

    Ami itt fontos, hogy ezt át kell adni, mert ezen fogunk majd végigmenni egy forEach-vel
    és az a req.session.cart-ból megkapott adatokat fogjuk megjeleníteni a tbody-ban 
        <tbody>
            <% cart?****.forEach((c)=> { %>
                <tr>
                    <td><%=c.productName%></td>
                    <td><%=c.quantity%></td>
                    <td><%=c.price%></td>
                    <td><%=c.quantity * c.price%></td>
                </tr>
            <% }) %>
        </tbody>

    Nagyon fontos, hogy kell a ?, mert hibát fog dobni ha nincsen cart!! 

    Fontos, hogy a price-t is meg akarjuk jeleníteni, tehát majd azt is át kell adni 
        <form method="post" action="<%=baseUrl/add-to-cart%>"
        class="grid-2" style="margin-top: 25px;">
            <div>
                <input type="number" value="1" name="quantity">
                <input type="hidden" name="productID" value="<%=productData?.productID%>">
                <input type="hidden" name="productName" value="<%=productData?.productName%>">
                <input type="hidden" name="price" value="<%=productData?.price%>">     ***************
            </div>

    és ezt majd parseInt-elni kell meg be kell dobni a pData-ba a Cart.js-en, hogy meg tudjuk majd itt jeleníteni 
        getProductData(productData) {
        const pData = {
            productID: parseInt(productData.productID),
            quantity: parseInt(productData.quantity),
            price: parseInt(productData.price), *****************
            productName: productData.productName
        }

        return pData;

    És így már meg fog jelenni az Ár meg a Részösszeg is 
    ********************
    Megcsináljuk a price format-ot 
    const number = 123456.789;

console.log(
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
        number,
    ),
    );
    // Expected output: "123.456,79 €"

    // The Japanese yen doesn't use a minor unit
    console.log(
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(
        number,
    ),

    const price = 14340;

    // Format the price above to USD using the locale, style, and currency.
    let USDollar = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    Alapból egy valutának a formátumát adja meg!!! 
    De van egy másik formutáma a toLocalString()-es
    
    const number = 123456.789
    const formatToNumber = number.toLocalString('en-US' {
        style: 'currency',
        currency: 'USD'
    });

    console.log(formatToNumber) -> $123,456.79

    És a cart-ban megcsináljuk ilyen formátumban
                    <td>
                        <%c.price.toLocalString('hu-HU' {
                        style: 'currency',
                        currency: 'HUF',
                        maximumFractionDigits: 2  ***
                    });%>
                    </td>
                    <td>
                        <%(c.price * c.quantity).toLocalString('hu-HU' {
                        style: 'currency',
                        currency: 'HUF',
                        maximumFractionDigits: 2 ***
                    });%>
                    </td>
                </tr>

    de most kiírja, hogy FT122,44 és ezeket, hogy ne írja ki mert nálunk nincs ilyen, hogy FT599,99
    Erre van ilyen, hogy minimum meg maximumFractionDigits
    -> 
    const formattedNumber = number.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    Lesz a mennyiségnél egy +/- gomb, meg kell egy további sor a törlésre 
    ->
            <thead>
            <tr>
                <td>Terméknév</td>
                <td>Mennyiség</td>
                <td>Ár</td>
                <td>Részösszeg</td>
                <td>Törlés</td>        **************
            </tr>
        </thead>
        <tbody>
            <% cart.forEach((c)=> { %>
                <tr>
                    <td><%=c.productName%></td>
                    <td><%=c.quantity%></td>
                    <td>
                        <%c.price.toLocalString('hu-HU' {
                        style: 'currency',
                        currency: 'HUF'
                    });%>
                    </td>
                    <td>
                        <%(c.price * c.quantity).toLocalString('hu-HU' {
                        style: 'currency',
                        currency: 'HUF'
                    });%>
                    </td>
                    <td>
                        <form method="POST" action="<%=baseUrl%>/remove-cart-product/<%=c.productID%>">
                            <button>Törlés</button>
                        </form>
                    </td>

    Fontos, hogyha megadjuk a button-nek a value-val a %=c.productID%, akkor elküldi post-val az id-t  
        <form method="POST" action="<%=baseUrl%>/remove-cart-product">   **********
                <button value="<%=c.productID%********>">Törlés</button>
        </form>
    De egy másik megoldás, hogy benne van az URL-ben a productID
    -> 
        <td>
            <form method="POST" action="<%=baseUrl%>/remove-cart-product/<%=c.productID%>">
                <button>Törlés</button>
            </form>
        </td>

    Megcsináljuk az endpoint-ot erre a post-os törlés és itt majd csak a deleteProduct-ot kell meghívni a Cart.js-ből
    Mert az megold mindent a splice()-val és még a cart-ot is frissíti 
    ->
    deleteProduct(productID*******) {
        const index = this.findIndex(productID);

        if(index !== -1) 
            this._cart.splice(index, 1);

        this._session.cart = this_cart; 

    app.post("/remove-cart-product:productID********", (req, res)=> {
    try {
        c.cart = req.session.cart;
        c.session = req.session;
        c.deleteProduct(parseInt(req.params.productID*******));
        
        ez csak az id-t várja a többi adatot nem, de viszont parseInt-elni kell itt
        és nagyon fontos, hogy nem req.body hanem req.params, mert ezt a url-ben küldjük el 
        action="<%=baseUrl%>/remove-cart-product/<%=c.productID%>">
        
    } catch(err) {

    }

    res.redirect(`/kosar`);
});

És müködik, kitörlünk egy terméket és visszaírányítunk a kosárra, ahol voltunk és nem fog látszodni a termék 

localhost:3000/termekek
rákattintunk a képre, megnyitjuk azt a terméket 
localhost:3000/termek/33
belerakjuk a kosárba 
localhost:3000/kosar
kitöröljük és visszaírányítunk ide a kosar-ra csak már nem lesz benne a termék 

Amit ez még nem csinál meg, hogy kéne látnunk egy ilyen összesítést az utolsó sorban 
terméknév       mennyiség           ár          részösszeg            törlés 
Amos H812           3             138009FT       414027FT            törlés gomb 
                  Összesen                   minden összeaadva      kiürítés gomb

Az index-en, ahol a kosár van létrehozunk egy létrehozunk egy olyan változót, hogy teljes összeg 



*/ 

