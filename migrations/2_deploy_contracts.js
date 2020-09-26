var DappAssetCordinator = artifacts.require("./DappAssetCordinator.sol");

module.exports = function (deployer) {
  deployer.deploy(DappAssetCordinator);
};
