App = {
  web3Provider: null,
  contracts: {},
  account: 0x0,
  loading: false,

  init: async () => {
    return App.initWeb3();
  },

  initWeb3: async () => {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.enable();
        App.displayAccountInfo();
        return App.initContract();
      } catch (error) {
        //user denied access
        console.error(
          "Unable to retrieve your accounts! You have to approve this application on Metamask"
        );
      }
    } else if (window.web3) {
      window.web3 = new Web3(web3.currentProvider || "ws://localhost:8545");
      App.displayAccountInfo();
      return App.initContract();
    } else {
      //no dapp browser
      console.log(
        "Non-ethereum browser detected. You should consider trying Metamask"
      );
    }
  },

  displayAccountInfo: async () => {
    const accounts = await window.web3.eth.getAccounts();
    App.account = accounts[0];
    $("#account").text(App.account);
    const balance = await window.web3.eth.getBalance(App.account);
    $("#accountBalance").text(
      window.web3.utils.fromWei(balance, "ether") + " ETH"
    );
    App.aggressivMarketTesting();
  },

  initContract: async () => {
    $.getJSON("DappAssetCordinator.json", (AssetmanagementArtifact) => {
      App.contracts.DappAssetCordinator = TruffleContract(
        AssetmanagementArtifact
      );
      App.contracts.DappAssetCordinator.setProvider(
        window.web3.currentProvider
      );
      App.listenToEvents();
      return App.reloadArticles();
    });
  },

  // Listen to events raised from the contract
  listenToEvents: async () => {
    const assetManagementInstance = await App.contracts.DappAssetCordinator.deployed();
    if (App.logSellArticleEventListener == null) {
      App.logSellArticleEventListener = assetManagementInstance
        .NewAssetOnMarket({ fromBlock: "0" })
        .on("data", (event) => {
          $("#" + event.id).remove();
          $("#events").append(
            '<li class="list-group-item" id="' +
              event.id +
              '">' +
              event.returnValues._name +
              " is for sale</li>"
          );
          App.reloadArticles();
        })
        .on("error", (error) => {
          console.error(error);
        });
      console.log(App.logSellArticleEventListener);
    }
    if (App.logBuyArticleEventListener == null) {
      App.logBuyArticleEventListener = assetManagementInstance
        .AssetSoldOnMarket({ fromBlock: "0" })
        .on("data", (event) => {
          $("#" + event.id).remove();
          $("#events").append(
            '<li class="list-group-item" id="' +
              event.id +
              '">' +
              event.returnValues._buyer +
              " bought  " +
              event.returnValues._name +
              "</li>"
          );
          App.reloadArticles();
        })
        .on("error", (error) => {
          console.error(error);
        });
    }
    $(".btn-show-events").show();
  },

  timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time =
      date + " " + month + " " + year + " " + hour + ":" + min + ":" + sec;
    return time;
  },

  getTransactionHistory: async (event) => {
    var _articleId = $(event.target).data("id");
    console.log(_articleId);
    const assetManagementInstance = await App.contracts.DappAssetCordinator.deployed();
    const arraylength = await assetManagementInstance.getArrayLength(
      _articleId
    );
    console.log(arraylength.length);
    $("#transactionHistory").empty();
    for (let i = 0; i < arraylength.length; i++) {
      const test = await assetManagementInstance
        .getTimeAndOwner(_articleId, i)
        .then((event) => {
          const localizedDate =
            new Date(event.time * 1000).toLocaleDateString() +
            " um " +
            new Date(event.time * 1000).toLocaleTimeString();
          $("#transactionHistory").append(
            '<li class="list-group-item my-3">' +
              "<b>Besitzer</b>: " +
              event.owner +
              ", <b>gekauft am</b>: " +
              localizedDate +
              "</li>"
          );
        });
    }
    $(".btn-transactionHistory").show();
  },

  getTransactionHistorySell: async (event) => {
    var _articleId = $(event.target).data("id");
    console.log(_articleId);
    const assetManagementInstance = await App.contracts.DappAssetCordinator.deployed();
    const arraylength = await assetManagementInstance.getArrayLength(
      _articleId
    );
    console.log(arraylength.length);
    $("#transactionHistorySell").empty();
    for (let i = 0; i < arraylength.length; i++) {
      const test = await assetManagementInstance
        .getTimeAndOwner(_articleId, i)
        .then((result) => {
          const localizedDate =
            new Date(result.time * 1000).toLocaleDateString() +
            " um " +
            new Date(result.time * 1000).toLocaleTimeString();
          $("#transactionHistorySell").append(
            '<li class="list-group-item my-3">' +
              "<b>Besitzer</b>: " +
              result.owner +
              ", <b>gekauft am</b>: " +
              localizedDate +
              "</li>"
          );
        });
    }
    $(".btn-transactionHistorySell").show();
  },

  sellOwnAsset: async (event) => {
    event.preventDefault();
    var _articleId = $(event.target).parent("#btn-sellOwnOnMarket").data("#id");
    const articlePriceValue = await parseFloat(
      $("#article_price_sellOwn").val()
    );
    const articlePrice = isNaN(articlePriceValue)
      ? "0"
      : articlePriceValue.toString();
    console.log("this is the Price " + articlePrice);
    console.log("this is the _article id " + _articleId);
    const _name = $("#article_name_sell").val();
    const _description = $("#article_description_sell").val();
    const _price = BigInt(window.web3.utils.toWei(articlePrice, "ether"));
    if (_name.trim() == "" || _price === "0") {
      return false;
    }
    try {
      const assetManagementInstance = await App.contracts.DappAssetCordinator.deployed();
      const transactionReceipt = await assetManagementInstance
        .sellArticle(_name, _description, _price, {
          from: App.account,
          gas: 6000000,
        })
        .on("transactionHash", (hash) => {
          console.log("transaction hash", hash);
        });
      console.log("transaction receipt", transactionReceipt);
    } catch (error) {
      console.error(error);
    }
    App.reloadArticles();
  },

  createAsset: async () => {
    console.log("creating");
    const articlePriceValueCreate = parseFloat(
      $("#article_price_create").val()
    );
    const articlePriceCreate = isNaN(articlePriceValueCreate)
      ? "0"
      : articlePriceValueCreate.toString();
    const _nameCreate = $("#article_name_create").val();
    const _descriptionCreate = $("#article_description_create").val();
    const _priceCreate = window.web3.utils.toWei(articlePriceCreate, "ether");
    if (_nameCreate.trim() == "") {
      return false;
    }
    try {
      const assetManagementInstance = await App.contracts.DappAssetCordinator.deployed();
      const transactionReceipt = await assetManagementInstance
        .createAsset(_nameCreate, _descriptionCreate, {
          from: App.account,
          gas: 6000000,
        })
        .on("transactionHash", (hash) => {
          console.log("transaction hash: ", hash);
        });
      console.log("transaction receipt: ", transactionReceipt);
      App.reloadAssetsOfUser();
    } catch (error) {
      console.error(error);
    }
  },

  buyArticle: async () => {
    event.preventDefault();

    // reich htrieve the article price
    var _articleId = $(event.target).data("id");
    const articlePriceValue = parseFloat($(event.target).data("value"));
    const articlePrice = isNaN(articlePriceValue)
      ? "0"
      : articlePriceValue.toString();
    const _price = window.web3.utils.toWei(articlePrice, "ether");
    try {
      const assetManagementInstance = await App.contracts.DappAssetCordinator.deployed();
      const transactionReceipt = await assetManagementInstance
        .buyArticle(_articleId, {
          from: App.account,
          value: _price,
          gas: 600000,
        })
        .on("transactionHash", (hash) => {
          console.log("transaction hash", hash);
        });
      console.log("transaction receipt", transactionReceipt);
    } catch (error) {
      console.error(error);
    }
  },

  sellDirectOnMarkt: async (event) => {
    event.preventDefault();
    var _articleId = $(event.target).data("id");
    console.log("sell direkt on Market; own Article ID " + _articleId);
    const articlePriceValue = parseFloat($(event.target).data("value"));
    const articlePrice = isNaN(articlePriceValue)
      ? "0"
      : articlePriceValue.toString();
    const _price = window.web3.utils.toWei(articlePrice, "ether");
    console.log("sell id from object: " + _articleId + " sellprice " + _price);

    try {
      const assetManagementInstance = await App.contracts.DappAssetCordinator.deployed();
      const transactionReceipt = await assetManagementInstance
        .sellOwnArticle(_articleId, _price, {
          from: App.account,
          gas: 5000000,
        })
        .on("transactionHash", (hash) => {
          console.log("transaction hash", hash);
        });
    } catch (error) {
      console.error(error);
    }
    App.reloadArticles();
  },

  removeArticle: async () => {
    event.preventDefault();
    var _articleId = $(event.target).data("id");

    try {
      const assetManagementInstance = await App.contracts.DappAssetCordinator.deployed();
      const transactionReceipt = await assetManagementInstance
        .removeFromMarket(_articleId, {
          from: App.account,
          gas: 5000000,
        })
        .on("transactionHash", (hash) => {
          console.log("transaction hash", hash);
        });
    } catch (error) {
      console.error(error);
    }
    App.reloadArticles();
  },

  reloadArticles: async () => {
    // avoid reentry
    if (App.loading) {
      return;
    }
    App.loading = true;

    // refresh account information because the balance may have changed
    App.displayAccountInfo();

    try {
      const assetManagementInstance = await App.contracts.DappAssetCordinator.deployed();
      $("#articlesRow").empty();
      console.log(
        "Array in reloadArticels(): "
        //JSON.stringify(, null, 4)
      );
      var numberAssetsOnMarket = assetManagementInstance.getNumberOfAssetsOnMarket();
      for (let i = 0; i < numberAssetsOnMarket; i++) {
        const marketSellObject = await assetManagementInstance.getMarketSellObject(
          i //spot in MarketPlace
        );
        //console.log("Thats the Article i= " + i + " and aticleID ");
        const assetInformation = await assetManagementInstance.getAssetByID(
          getMarketSellObject.assetID
        );
        console.log("some test shit ");
        // Problem! if added   -onlyf artikel is not deleted at that spot
        App.displayArticle(
          getMarketSellObject[0], //ID
          getMarketSellObject[2], //OWNER third spot
          assetInformation.name, //NAME from Jason Object
          assetInformation.description, //DESCRIPTION Jason Object
          getMarketSellObject[1] //PRICE
        );
      }

      App.loading = false;
    } catch (error) {
      console.error(error);
      App.loading = false;
    }
    App.reloadAssetsOfUser();
  },

  reloadAssetsOfUser: async () => {
    if (App.loading) {
      return;
    }
    App.loading = true;

    // refresh account information because the balance may have changed
    App.displayAccountInfo();

    try {
      const assetManagementInstance = await App.contracts.DappAssetCordinator.deployed();
      //App.account is the current user that is loged in
      const assetIDArray = await assetManagementInstance.getAssetIDsOfAddress(
        App.account
      );
      console.log("IDs of Owned Assets in Array: " + assetIDArray);
      console.log("- - ->   ${testObject}");
      //console.log(JSON.stringify(testObject, null, 2));
      // console.log(testObject.name);

      $("#articlesRow2").empty();
      for (let i = 0; i < assetIDArray.length; i++) {
        var assetData = await assetManagementInstance.getAssetByID(
          assetIDArray[i]
        );

        console.log("Data from the Asset: " + "  and the i:  " + i);
        App.displayUserAssets(
          assetIDArray[i], // Asset ID
          App.account, //current account Owner, we got it by his Address
          assetData[0], //name of Asset
          assetData[1] //description
          //assetData[0], //price
          //assetData[0] //uniqueId
        );
      }
      App.loading = false;
    } catch (error) {
      console.error(error);
      App.loading = false;
    }
  },

  displayArticle: (id, seller, name, description, price) => {
    // Retrieve the article placeholder
    const articlesRow = $("#articlesRow");
    const etherPrice = window.web3.utils.fromWei(price, "ether");
    console.log(
      "log seller of article: " + seller + " eth pirce " + etherPrice
    );
    // Retrieve and fill the article template
    var articleTemplateSell = $("#articleTemplateSell");
    articleTemplateSell.find(".article-name-sell").text(name);
    articleTemplateSell.find(".article-description-sell").text(description);
    articleTemplateSell.find(".article-price-sell").text(etherPrice + " ETH");
    articleTemplateSell.find(".btn-buy").attr("data-id", id);
    articleTemplateSell.find(".btn-transactionHistory");
    //.attr("data-id", uniqueId);
    articleTemplateSell.find(".btn-transactionHistorySell");
    //.attr("data-id", uniqueId);
    articleTemplateSell.find(".btn-remove").attr("data-id", id);
    articleTemplateSell.find(".btn-buy").attr("data-value", etherPrice);

    // seller?
    if (seller == App.account) {
      articleTemplateSell.find(".article-seller-sell").text("You");
      articleTemplateSell.find(".btn-buy").hide();
      articleTemplateSell.find(".btn-remove").show();
    } else {
      articleTemplateSell.find(".article-seller-sell").text(seller);
      articleTemplateSell.find(".btn-buy").show();
      articleTemplateSell.find(".btn-remove").hide();
      //articleTemplateSell.find("remove-asset-market").hide();
    }

    // add this new article
    articlesRow.append(articleTemplateSell.html());
  },

  displayUserAssets: (id, owner, name, description, price) => {
    // Retrieve the article placeholder
    const articlesRow2 = $("#articlesRow2");
    //BN.js --Important! cant use bigNumber dont no why
    //bigNumPrice = new web3.utils.BN(price);
    //var etherPrice = new web3.utils.fromWei(BN(bigNumPrice), "ether");
    // Retrieve and fill the article template
    var articleTemplateCreate = $("#articleTemplateCreate");
    articleTemplateCreate.find(".article-name-create").text(name);
    articleTemplateCreate.find(".article-description-create").text(description);
    articleTemplateCreate.find(".article-price-create");
    //.text(etherPrice + " ETH");
    articleTemplateCreate.find(".btn-buy").attr("data-id", id);
    articleTemplateCreate.find(".btn-sellOwnOnMarket").attr("data-id", id);
    //articleTemplateCreate.find(".btn-buy").attr("data-value", etherPrice);   //no price in own Artickels
    articleTemplateCreate.find(".btn-transactionHistory");
    //.attr("data-id", uniqueId);

    console.log(
      "ID of: " +
        id +
        " Owner Displayed is: " +
        name +
        " Seller: " +
        owner +
        " line steht am Rand 320 "
    );

    // seller?
    if (owner == App.account) {
      articleTemplateCreate.find(".article-seller-create").text("You");
      articleTemplateCreate.find(".btn-buy");
    }
    //Important!  add this new article  //move it up later to be sure only user Assets visb.
    articlesRow2.append(articleTemplateCreate.html());
  },
};

aggressivMarketTesting: {
  App.displayArticle(3, null, "Irgendein Name create", "describe that this");
  App.displayArticle(3, null, "Zweiter Name create", "describe this id ");
}

$(function () {
  $(window).load(function () {
    App.init();
  });
});
