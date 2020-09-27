pragma solidity >0.4.99 <0.8.0;

contract DappAssetCordinator {
    struct Asset {
        uint256 id;
        string name;
        string description;
        //address owner;
    }

    //no Asset with  0
    uint256 idCount = 0;
    //no Asset at 0
    Asset[] allAssets;
    uint256 totalNumberAssets;

    constructor() {
        //prevents push to use index 0
        allAssets.push();
        delete allAssets[0];
    }

    mapping(uint256 => uint256) idToPosition;

    ///@dev Mapps all the asstets to their owners
    mapping(uint256 => address payable) idToOwnerAddress;

    ///@dev Mapps all addresses to a number of assets thy own
    mapping(address => uint256) addressToNumberAssets;

    ///@dev Mapps for every Address the an Arry of Asset IDs owned by the Address
    mapping(address => uint256[]) addressToIDArrary;

    mapping(uint256 => uint256) idToPositionInOwnerArray;

    //  -   -   -   -   -   - Market   -   -   -   -   -   -   -
    // MARKET AREA
    //Idee für dne Markt
    MarktSell[] public marketPlace;
    uint256 internal numberOfAssetsOnMarket = 0;
    mapping(uint256 => uint256) public idToSpotOnMarket;

    struct MarktSell {
        uint256 assetID;
        uint256 price;
        address payable owner;
    }

    function getPriceOfAssetsFormMarket(uint id) public view returns(uint price){
        if(idToSpotOnMarket[id]!=0){
        return marketPlace[idToSpotOnMarket[id]].price;
        }
    }

    //  -   -   -   -^   -   -^ Market ^ -   -^   -   -   -   -   -
    //HistoryOfOwner
    //  -   -   -   -   -   - Transaction History -   -   -   -   -   -   -   -   -   -
    mapping(uint256 => address[])  addToHistoryOfOwners;
    mapping(uint256 => uint256[])  addToDateOfTransfer;
    
    //check length first, dont go over length -1 
    //check length first, dont go over length -1 
    function getOwnerAndTimeStamp(uint _id, uint position) public view returns(address,uint256) {
        if(position < addToDateOfTransfer[_id].length){
            return(addToHistoryOfOwners[_id][position],addToDateOfTransfer[_id][position]);
        }
        return(address(0),0);
    }

    function getHistoryLength(uint _id) public view returns(uint length){
       length = addToDateOfTransfer[_id].length;
    }
    
    //gets called when Asset is created or changes user 
    //block time can be manipulted by miners, but we only talking about 15 min max 
    function setOwnerAndTimeStamp(uint _id) public{
        address currentOwnerAddress = idToOwnerAddress[_id];
        addToHistoryOfOwners[_id].push(currentOwnerAddress);
        addToDateOfTransfer[_id].push(block.timestamp);
    }
    //  -   -   -   -^   -   -^ Transaction History ^ -   -^   -   -   -   -   -
    // only asset array grows
    function createAsset(string memory _name, string memory _description)
        public
        returns (uint256)
    {
        idCount++;

        allAssets.push(Asset(idCount, _name, _description));
        
        idToOwnerAddress[idCount] = msg.sender; 
        //finding the right spot to add asset id 
        //first free space in array                                         !Problem empty mapping will give first spot allways 
        uint postionToAdd = addressToNumberAssets[msg.sender];

        idToPositionInOwnerArray[idCount] = postionToAdd;

        if(postionToAdd < addressToIDArrary[msg.sender].length ){

            addressToIDArrary[msg.sender][postionToAdd] =idCount;

        }else {

            addressToIDArrary[msg.sender].push(idCount);
        }

        //addressToNumberAssets[msg.sender]++;
        addressToNumberAssets[msg.sender]++;
        //set new owner in Histoy 
        setOwnerAndTimeStamp(idCount);
        emit NewAssetCreated(
             idCount,
             msg.sender,
            _name,
            _description
        );

        return idCount;
    }

    //Problem! check if it is for sale
    function exchangeAsset(uint256 _id) public {
        address owner = idToOwnerAddress[_id];
        address payable buyer = msg.sender;
        uint256 ownerNumber = addressToNumberAssets[owner];
        uint256 buyerNumber = addressToNumberAssets[buyer];

        require(owner != buyer, "you allready have this Asset ");

        //id in ownersArry deleted
        delete addressToIDArrary[owner][idToPositionInOwnerArray[_id]];

        // - - - - - -delete Elment and shorten Array ---
        //get last Element of Arry
        uint256 idAtLastSpot = addressToIDArrary[owner][ownerNumber - 1];
        //store last Element at now empty spot
        addressToIDArrary[owner][idToPositionInOwnerArray[_id]] = idAtLastSpot;

        //correct finder of last element by setting old postion of idCount for last element
        idToPositionInOwnerArray[idAtLastSpot] = idToPositionInOwnerArray[_id];

        //delte last element of Arry
        delete addressToIDArrary[owner][ownerNumber - 1];

        /// ----  -- - - - deleting is over

        //            - add ID to buyer

        idToOwnerAddress[_id] = buyer;
        //position to add is allways one more than assets because of leading 0
        idToPositionInOwnerArray[_id] = buyerNumber;
        //arry filled with zero ? (if == arry full need push)
        if (buyerNumber < addressToIDArrary[buyer].length) {
            //next free Space is at that space
            addressToIDArrary[buyer][buyerNumber] = _id;
        } else {
            // case: array is full so we can only use push
            // add to list and make pointer for ID
            addressToIDArrary[buyer].push(_id);
            idToPositionInOwnerArray[_id] = buyerNumber;
        }

        addressToNumberAssets[owner]--;
        addressToNumberAssets[buyer]++;
    }

    function removeFromMarket(uint256 _id ) public {
        if(_id != 0 && _id==allAssets[_id].id&&msg.sender == idToOwnerAddress[_id]){
        uint postionToRemove = idToSpotOnMarket[_id];
         idToSpotOnMarket[_id] = 0;
        // MarktSell memory sellStruct = marketPlace[postionToRemove];
        
        // - - - - - -delete AssetSell and place last MarketSell at now emptpy Position ---
        if(numberOfAssetsOnMarket > 1&& postionToRemove >= 0&& _id !=0){
         //get last Element of Arry 
         MarktSell storage sellAtLastSpot =  marketPlace[numberOfAssetsOnMarket-1];
          
         marketPlace[postionToRemove] = sellAtLastSpot;
         //set last Element to empty spot 
         //store last Element at now empty spot  
         //add them eache by eache 
         //marketPlace[postionToRemove].price = sellAtLastSpot.price ;
        // marketPlace[postionToRemove].assetID = sellAtLastSpot.assetID;
        // marketPlace[postionToRemove].owner = sellAtLastSpot.owner;
         //correct finder of last element by setting old position of assetID for last element
         idToSpotOnMarket[sellAtLastSpot.assetID] = postionToRemove;
         //
        }
        
         numberOfAssetsOnMarket--;
         //if you substact before its fine just add -1 
         //delete marketPlace[numberOfAssetsOnMarket].price;
         delete marketPlace[numberOfAssetsOnMarket].assetID;
         delete marketPlace[numberOfAssetsOnMarket];
         
         //delte last assetsell of Arry (we have to at the moment)
         //new numberOfAssets 
        }
    }

    function removeAssetFromMarket(uint256 _id) public {
        uint256 idOfAsset = _id;
        if(_id != 0 && _id==allAssets[_id].id&&msg.sender == idToOwnerAddress[_id]){
        
        address addOwner  = idToOwnerAddress[_id];
        require(addOwner == msg.sender, "only Owner can remove the Asset form marketPlace");
        require(isAssetForSale(_id),"Asset is not on the Market");
        require(numberOfAssetsOnMarket>0 &&_id != 0, "there are no selling articel on the Market");
        bool fatalErro =  numberOfAssetsOnMarket < 0;
        require(fatalErro, "fatle error there are a negtive amound of assets");
        removeFromMarket(idOfAsset);
        }
    }

    function buyAsset(uint _id) public payable {
     require(_id != 0, "you cant buy asset with id zero");
        require (isAssetForSale(_id), "Item is not for selling on the Market");
        address owner = idToOwnerAddress[_id];
        address payable buyer = msg.sender; 
        require (owner != buyer, "you allready have this Asset ");
        //check when added to market 
        //require (seller == idToOwnerAddress[_id],"Seller is not the Owner!");
        //get 
        uint256 price = marketPlace[idToSpotOnMarket[_id]].price;
        address payable ownerAddress = marketPlace[idToSpotOnMarket[_id]].owner;
        require(
           price <= msg.value,"Value provided does not match price of article" );
        //send it to owner 
        //new standart we shouldnt use transfer anymore 

       //Problem! Transfer dont works at the moment  
        ownerAddress.transfer(price);
        //ownerAddress.call.value(price)("");ç
       (bool success, ) = ownerAddress.call{value:price}("");
        require(success, "Transaction failed");
        //ownerAddress.transfer(price);
        exchangeAsset(_id);
        removeFromMarket(_id);
        setOwnerAndTimeStamp(_id);
        emit AssetSoldOnMarket(
         _id,
         allAssets[_id].name,
         owner,
         buyer 
        );
        //save transfer after istans
        // = 
    }


    function sellAsset(uint256 _id, uint256 price)
        public
        returns (uint256 assetID)
    {
        bool notoOnMarket = !isAssetForSale(_id);
        if(_id == allAssets[_id].id){
        require(msg.sender == idToOwnerAddress[_id], "you need to be the owner to use this method" );
        require(notoOnMarket, "Asset is allready for sell on the Market");
        require(_id!=0, "Asset with ID zero cant be sold ");
        // require(_id <= 0,"id is zero in sellAsset  ");
        address payable owner = idToOwnerAddress[_id];
        // require(msg.sender == owner,"owner can only sell the Item");
        //require(_id <= 0,"id  is zero before change sellAsset method is negativ");
        // important that you cant sell your asset multiple times 
        //postion will allways be one more than the assets on the market 
        uint positionToAdd = numberOfAssetsOnMarket;
        //we need to check weather we can only use push 
         if (positionToAdd < marketPlace.length){
             //next free Space is at that space
             marketPlace[positionToAdd] = MarktSell(_id,price,owner);
            // marketPlace[positionToAdd].assetID = _id;
             //marketPlace[positionToAdd].price = price;
            // marketPlace[positionToAdd].owner = owner;
         }else {// case: array is full so we can only use push
            // add to list and make pointer for ID 
            marketPlace.push(MarktSell(_id,price,owner));
         }
         idToSpotOnMarket[_id] = positionToAdd;
         numberOfAssetsOnMarket++;
         //require(positionToAdd <= 0,"postion to add is zero in sellAsset");
         emit  NewAssetOnMarket(
            _id,
            msg.sender,
            price,
            allAssets[_id].name ,
           allAssets[_id].description
         );

         return positionToAdd;

        }
       return 0;
    }

    //TODO! returns Arikel IDs available for sale need mapping to get real IDs
    function getAssetIdsOnMarket()
        public
        view
        returns (uint256[] memory idArray)
    {
        uint256[] memory ids = new uint256[](numberOfAssetsOnMarket);
        for (uint256 i = 0; i < numberOfAssetsOnMarket; i++) {
            ids[i] = marketPlace[i].assetID;
        }
        idArray = ids;
    }

    //retruns id , pice and owner of Asset on the Market
    function getMarketSellObject(uint spotInMarket) public view returns(uint,uint,address ){
         return (marketPlace[spotInMarket].assetID, marketPlace[spotInMarket].price,marketPlace[spotInMarket].owner);
    }

    function getAssetIDsOfAddress(address _address)
        public view
        returns (uint256[] memory)
    {
        return addressToIDArrary[_address];
    }

    function getAssetByID(uint id) public view returns(string memory name , string memory description) {
       return (allAssets[id].name, allAssets[id].description);
    }

    //TODO! use allAssets and use totallAccountofAssets
    function getAllAssetsExisting() public returns (uint256[] memory) {}


    //Should work  delte Object by owner mapping and restructuring COMPLICATED! Problem!
    function deleteAssetByID(uint256 _assetID) public onlyOwner(_assetID) {
       uint postionToRemove = idToSpotOnMarket[_assetID];
         idToSpotOnMarket[_assetID] = 0;
        // MarktSell memory sellStruct = marketPlace[postionToRemove];
        
        // - - - - - -delete AssetSell and place last MarketSell at now emptpy Position ---
        if(numberOfAssetsOnMarket > 1&& postionToRemove >= 0&& _assetID !=0){
         //get last Element of Arry 
         MarktSell storage sellAtLastSpot =  marketPlace[numberOfAssetsOnMarket-1];
          
         marketPlace[postionToRemove] = sellAtLastSpot;
         //set last Element to empty spot 
         //store last Element at now empty spot  
         //add them eache by eache 
         //marketPlace[postionToRemove].price = sellAtLastSpot.price ;
        // marketPlace[postionToRemove].assetID = sellAtLastSpot.assetID;
        // marketPlace[postionToRemove].owner = sellAtLastSpot.owner;
         
         
         //correct finder of last element by setting old position of assetID for last element
         idToSpotOnMarket[sellAtLastSpot.assetID] = postionToRemove;
         //
        }
        
         numberOfAssetsOnMarket--;
         //if you substact before its fine just add -1 
         //delete marketPlace[numberOfAssetsOnMarket].price;
         delete marketPlace[numberOfAssetsOnMarket].assetID;
         delete marketPlace[numberOfAssetsOnMarket];
        //!Problem dont works! realy good
    }
    
    //Problem! check if the returns of ID is good idea
    function sellDirectToTheMarket(
        string memory _name,
        string memory _description,
        uint256 _price
    ) public returns (uint256) {
        uint256 _assetID = createAsset(_name, _description);
        sellAsset(_assetID, _price);
        return _assetID;
    }

    function isAssetForSale(uint256 _id) public view returns (bool forSale) {
        uint256 position = idToSpotOnMarket[_id];
        if (position == 0 && numberOfAssetsOnMarket == 0) {
            return false;
        } else if (marketPlace[position].assetID == _id) {
            return true;
        }
        return false;
    }

    function getNumberOfAssetsOnMarket() public view returns (uint256) {
        return numberOfAssetsOnMarket;
    }

    event NewAssetOnMarket(
        uint256 assetID,
        address seller,
        uint256 pirceOfAsset,
        string nameOfAsset,
        string descripition
    );

    event AssetSoldOnMarket(
        uint256 assetID,
        string  nameOfAsset,
        address soldByAddress,
        address boughtByAddress
    );

    event NewAssetCreated(
        uint256 assetID,
        address assetOwner,
        string nameOfAsset,
        string description
    );

    event AssetSoldOnMarket(uint256 assetID);


    //checks if the asset id is really for sell
    modifier safeBuying(uint256 id) {
        require(
            marketPlace[idToSpotOnMarket[id]].assetID != id,
            "Asset does not exist at Market Place "
        );
        require(
            marketPlace[idToSpotOnMarket[id]].owner != msg.sender,
            "Seller cannot buy his own article"
        );
        require(
            marketPlace[idToSpotOnMarket[id]].price == msg.value,
            "Value provided does not match price of article"
        );
        _;
    }

    //makes sure only the owner of the asstet can use this functions
    //Problem! use position Mapping
    modifier onlyOwner(uint256 id) {
        require(msg.sender == idToOwnerAddress[id]);
        _;
    }
}
