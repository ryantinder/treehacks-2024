// const options = {
//     method: "POST",
//     headers: {
//       "X-API-KEY": "sk_staging_6BGZbcseQWALHshVGAspABnd4Ff8FTiraXt7g5mHRrUfcEQKyGyDcBFTgBLWXBk2oo8ZXQkUzKErN9vvqgqejUDsNLSfxT11kMzVp2iJSeXw8uTKmyahsyrZJyzCmtb7aNrq2QGQhPwJ2Gs7r6fcNnu4Zn3uUj8feXauMnkfhLwJJjEAhUmXX2pVSypQbNCE1WfiBZ9FbVdLSfB23CyaSZKd",
//       "Content-Type": "application/json",
//     },
//     body: '{"credentialSubjectSchema":[{"name":"course","type":"string"},{"name":"passed","type":"bool"}]}',
// };
  
// fetch("https://staging.crossmint.com/api/unstable/credentials/types", options)
//     .then((response) => response.json())
//     .then((response) => console.log(response))
//     .catch((err) => console.error(err));

// const options = {
//     method: "POST",
//     headers: {
//       "X-API-KEY": "sk_staging_6BGZbcseQWALHshVGAspABnd4Ff8FTiraXt7g5mHRrUfcEQKyGyDcBFTgBLWXBk2oo8ZXQkUzKErN9vvqgqejUDsNLSfxT11kMzVp2iJSeXw8uTKmyahsyrZJyzCmtb7aNrq2QGQhPwJ2Gs7r6fcNnu4Zn3uUj8feXauMnkfhLwJJjEAhUmXX2pVSypQbNCE1WfiBZ9FbVdLSfB23CyaSZKd",
//       "Content-Type": "application/json",
//     },
//     body: '{"chain":"polygon","credentials":{"type":"urn:uuid:c804208b-72e8-4a43-a75e-4ec099e263a0"},"metadata":{"name":"VC Collection Name QS","description":"Test"}}',
//   };
  
//   fetch("https://staging.crossmint.com/api/unstable/collections/", options)
//     .then((response) => response.json())
//     .then((response) => console.log(response))
//     .catch((err) => console.error(err));

const collectionId = "f6d10f90-df64-4767-b328-70577111ae36";
const options = {
  method: "POST",
  headers: {
    "X-API-KEY": "sk_staging_6BGZbcseQWALHshVGAspABnd4Ff8FTiraXt7g5mHRrUfcEQKyGyDcBFTgBLWXBk2oo8ZXQkUzKErN9vvqgqejUDsNLSfxT11kMzVp2iJSeXw8uTKmyahsyrZJyzCmtb7aNrq2QGQhPwJ2Gs7r6fcNnu4Zn3uUj8feXauMnkfhLwJJjEAhUmXX2pVSypQbNCE1WfiBZ9FbVdLSfB23CyaSZKd",
    "Content-Type": "application/json",
  },
  body: '{"metadata":{"name":"Blockchain 101 Course Credential","image":"ipfs://QmUGeWerAfyKVVdAjaxYdAhK74oJmBvusPdKtNDN3e1bYN","description":"passed the course"},"recipient":"polygon:0xe9a21CC2fFa51e11318eb6D5EBb89c67B802F182","credential":{"subject":{"course":"Blockchain 101","passed":true},"expiresAt":"2034-02-02"}}',
};

fetch(
  `https://staging.crossmint.com/api/unstable/collections/${collectionId}/credentials`,
  options
)
  .then((response) => response.json())
  .then((response) => console.log(response))
  .catch((err) => console.error(err));