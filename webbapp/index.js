"use strict";

let allUsers = [];
const mainUserID = 19;
const paintings = [];
const mainUserFavorite = [];
const storagedPics = JSON.parse(localStorage.getItem("paintings"));

async function getPicsIDs (){
    const rqst = new Request ("https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId=11&q=snow");
    const response = await fetch(rqst);
    const picsIDs = await response.json();
    return picsIDs;
}

getPicsIDs()
.then(object => {

    object.objectIDs.forEach(id => {
        getPictureFromId(id)
        .then(pic => {
            paintings.push({
                objectID: pic.objectID,
                primaryImageSmall: pic.primaryImageSmall,
                title: pic.title,
                artistDisplayName: pic.artistDisplayName
            });
            localStorage.setItem("paintings", JSON.stringify(paintings));
        });
    })
})
.catch(error => console.log(error));

async function getPictureFromId(picId){
    const rqst = new Request (`https://collectionapi.metmuseum.org/public/collection/v1/objects/${picId}`)
    const response = await fetch(rqst);
    const pictureData = await response.json();
    return pictureData;
}

async function getUsers(){
    const response = await fetch("http://mpp.erikpineiro.se/dbp/sameTaste/users.php");
    const users = await response.json();
    return users;
}

getUsers()
.then(data => {

    document.getElementById("users").innerHTML = "";
    let userFetching = document.createElement("div");
    userFetching.classList.add("fetchingUsers");
    userFetching.innerText = "Fetching Users ...";

    document.getElementById("users").append(userFetching);

    document.getElementById("content").innerHTML = "";
    let picFetching = document.createElement("div");
    picFetching.classList.add("fetchingPics");
    picFetching.innerText = "Fetching Paintings ...";

    document.getElementById("content").append(picFetching);

    data.message.forEach(user =>{
        allUsers.push(user);
    })
        
    let mainUserFavoritePics = allUsers.find(user=> user.id == 19).favs;
        mainUserFavoritePics.forEach(id => mainUserFavorite.push(id));

    allUsers.sort((a,b) => a.alias > b.alias);
        
  
    if(storagedPics == null){
        createUsersField(allUsers);
        setTimeout(() => {
            document.getElementById("19").click();
            picFetching.classList.add("hide");
        }, 3000);
    }

    else{
        picFetching.classList.add("hide");
        createUsersField(allUsers);
        document.getElementById("19").click();
    }
    
})


function createUsersField (arrayOfUsers){

    if(document.querySelector(".fetchingUsers")){
        setTimeout(() => {
            document.querySelector(".fetchingUsers").classList.add("hide");
        }, 1000);
    }

    arrayOfUsers.forEach(user => {
        let userBox = document.createElement("div");
        userBox.classList.add("userBox");
    
        userBox.setAttribute("id", user.id)

        if(user.id === mainUserID){
            userBox.classList.add("selected");
            userBox.classList.add("mainUser");
                
            userBox.innerText = `${user.alias} [${user.favs.length}]`
        } 
            
        else{
            userBox.innerText = `${user.alias} [${user.favs.length}] (${getAmountJointPics(user.id)})`
        }

        userBox.addEventListener("click", ()=> {
        
            let selected = document.querySelectorAll(".selected");
            selected.forEach(s => {
                s.classList.remove("selected");
            })
            userBox.classList.add("selected");

            document.querySelector("#content").innerHTML = "";
            
        })

        document.querySelector("#users").append(userBox);
    })
}

document.querySelector("#users").addEventListener("click", (e) =>{
    
    let parsedSelectedUsersID = parseInt(e.originalTarget.id);

    if(parsedSelectedUsersID == mainUserID){
        getPaintings(storagedPics, parsedSelectedUsersID, mainUserFavorite);
    }  

    else {
        getJointPics(getFavoritPics(parsedSelectedUsersID));
    }
})

function getAmountJointPics(id){
    let jointFavorites = [];

    getFavoritPics(id).forEach(favoriteID => {
    
        let parsedIdd = parseInt(favoriteID);
              
        if(getFavoritPics(mainUserID).some(i => i === parsedIdd)){
            jointFavorites.push(parsedIdd)
        }
    })

    return jointFavorites.length;
}

function createBoxesAndPushPics (arrayOfPics, userId, mainUserFavorite){
    arrayOfPics.sort((a,b) => a.artistDisplayName > b.artistDisplayName);

    arrayOfPics.forEach(obj => {

        let imgBox = document.createElement("div");
        imgBox.classList.add("imgBox")

        let box = document.createElement("div");
        box.classList.add("box");

        let pic = document.createElement("img");
        pic.setAttribute("src", obj.primaryImageSmall);

        let updatingDB = document.createElement("div");
        updatingDB.classList.add("updatingDB");
        updatingDB.classList.add("hide");
        updatingDB.innerText = "updating DB ...";
        
        let addButton = document.createElement("button");
        addButton.classList.add("addButton");
        addButton.innerText = "Add";

        let removeButton = document.createElement("button");
        removeButton.classList.add("removeButton");
        removeButton.classList.add("hide");
        removeButton.innerText = "Remove";

        let errorText = document.createElement("div");
        errorText.classList.add("errorText");
        errorText.classList.add("hide");
        errorText.innerText = "Too many favs already";

        if(mainUserFavorite.some(number => number == obj.objectID)){
            imgBox.classList.toggle("favorite");
            addButton.classList.add("hide");
            removeButton.classList.remove("hide");
        }

        addButton.addEventListener("click", ()=>{
            
            updatingDB.classList.remove("hide");

            const parsedUserId = parseInt(userId);
            const parsedPicId = parseInt(obj.objectID)                   

            fetch(new Request('http://mpp.erikpineiro.se/dbp/sameTaste/users.php',
            {
            method: 'PATCH',
            headers: {"Content-type": "application/json; charset=UTF-8"},
            body: `{"id": ${parsedUserId}, "addFav": ${parsedPicId}}`,
            }))
            .then( response => {
                if (response.status === 409) {

                    errorText.classList.toggle("hide");
                    removeButton.classList.toggle("hide");
                    addButton.classList.add("hide");
                    imgBox.classList.toggle("favorite");
                
                } 
                else {
                return response.json();
                }
            })
            .then(arg => {
                setTimeout(() => {
                    errorText.classList.add("hide");
                }, 2000);

                
                removeButton.classList.toggle("hide");
                addButton.classList.toggle("hide");
                imgBox.classList.toggle("favorite");

                updatingDB.classList.add("hide");

                getuppdatedUsers();
            })
            .catch(error => console.log(error));
        });
        
        removeButton.addEventListener("click", ()=>{

            updatingDB.classList.remove("hide");

            const parsedUserId = parseInt(userId);
            const parsedPicId = parseInt(obj.objectID)                   

            fetch(new Request('http://mpp.erikpineiro.se/dbp/sameTaste/users.php',
            {
            method: 'PATCH',
            headers: {"Content-type": "application/json; charset=UTF-8"},
            body: `{"id": ${parsedUserId}, "removeFav": ${parsedPicId}}`,
            }))
            .then(response => { return response.json()})
            .then(arg => {
            
                addButton.classList.remove("hide");
                removeButton.classList.add("hide");
                imgBox.classList.remove("favorite");

                updatingDB.classList.add("hide");

                getuppdatedUsers();
            })
            .catch(error => console.log(error));

        });

        let titleOfPic = document.createElement("p");
        titleOfPic.classList.add("titleOfPic");

        titleOfPic.innerHTML = `
            ${obj.title}; by <span> ${obj.artistDisplayName}</span>
        `;
        imgBox.append(errorText,updatingDB,pic);
        box.append(addButton,removeButton,imgBox,titleOfPic);
    
        document.querySelector("#content").append(box);
    })
} 


function getPaintings(storedPics, userId, mainUserFavorite){

    if(storedPics){
        createBoxesAndPushPics(storedPics,userId,mainUserFavorite)
    }

    else{
        createBoxesAndPushPics(paintings,userId,mainUserFavorite)
    }
}

function getuppdatedUsers(){

    mainUserFavorite.splice(0, mainUserFavorite.length);
    allUsers = [];

    getUsers()
    .then(data => {
        data.message.sort((a,b) => a.alias > b.alias);

        let mainUserFavoritePics = data.message.find(user => user.id == mainUserID).favs;
        mainUserFavoritePics.forEach(id => mainUserFavorite.push(id));

        data.message.forEach(user =>{
            allUsers.push(user);
        })

        document.getElementById("users").innerHTML = "";

        createUsersField(data.message);
    })
    .catch(error => console.log(error));
}

function sendPictureFromID(id){
    let picture;
    paintings.forEach(pic => {
        if(pic.objectID == id){
            picture = pic;
        }
    })
    return picture;
}

function getFavoritPics(id){
    return  allUsers.find(user => user.id == id).favs;
}

function getJointPics (arrayOfFavIds){

        if(storagedPics){

            storagedPics.sort((a,b) => a.artistDisplayName > b.artistDisplayName);

            arrayOfFavIds.forEach(id =>{

                let favPic = storagedPics.find(obj => obj.objectID == id);
    
                let box = document.createElement("div");
                box.classList.add("box");
    
                let imgBox = document.createElement("div");
                imgBox.classList.add("friendBox")
                let pic = document.createElement("img");
                pic.setAttribute("src", favPic.primaryImageSmall);
                imgBox.classList.add("favorite");
    
                if(mainUserFavorite.some(fav => fav == id)){
                    imgBox.classList.add("jointPic");
                }
    
                let titleOfPic = document.createElement("p");
                titleOfPic.classList.add("titleOfPic");
    
                titleOfPic.innerHTML = `
                    ${favPic.title}; by <span> ${favPic.artistDisplayName}</span>
                `;
    
                imgBox.append(pic);
                box.append(imgBox,titleOfPic);
                document.querySelector("#content").append(box);
            });
        }
        else {
        
            arrayOfFavIds.forEach(id =>{

                let data = sendPictureFromID(id);

                let box = document.createElement("div");
                box.classList.add("box");
        
                let imgBox = document.createElement("div");
                imgBox.classList.add("friendBox")
                let pic = document.createElement("img");
                pic.setAttribute("src", data.primaryImageSmall);
                imgBox.classList.add("favorite");
        
                if(mainUserFavorite.some(fav => fav == id)){
                    imgBox.classList.add("jointPic");
                }
        
                let titleOfPic = document.createElement("p");
                titleOfPic.classList.add("titleOfPic");
        
                titleOfPic.innerHTML = `
                    ${data.title}; by <span> ${data.artistDisplayName}</span>
                `;
        
                imgBox.append(pic);
                box.append(imgBox,titleOfPic);
                document.querySelector("#content").append(box);
            });
        }      
}

function updateUsersPer30sn(selectedsID){
    allUsers = [];

    getUsers()
    .then(data => {
        data.message.sort((a,b) => a.alias > b.alias);

        data.message.forEach(user =>{
            allUsers.push(user);
        })

        document.getElementById("users").innerHTML = "";

        createUsersField(data.message);
        document.getElementById(selectedsID).click();
    })
    .catch(error => console.log(error));
}

setInterval(() => {

    let boxes = document.querySelectorAll(".userBox");
    let selectedBox = [];
    
    boxes.forEach(box => {
        if(box.classList.contains("selected")){
            selectedBox.push(box);
        }
    })

    let selectedsID = parseInt(selectedBox[0].id);

    document.getElementById("users").innerHTML = "";
    let userFetching = document.createElement("div");
    userFetching.classList.add("fetchingUsers");
    userFetching.innerText = "Fetching Users ...";

    document.getElementById("users").append(userFetching);

    setTimeout(() => {
        document.querySelector(".fetchingUsers").classList.add("hide");
    }, 1000);
 
    updateUsersPer30sn(selectedsID);
    
}, 30000);
