I will be implementing houdini swap (https://houdiniswap.com/) as the backend swap engine for this application.

I have an API key for this application. I will need guidance on the best way to safely store and use this API key within the application. You need to ensure that the API key is not exposed in any way.

Lets first startt by implementing the quick private swap functionality.

the way houdini swap works is as follows:

User selects the coins they want to swap and the amount they want to swap (in the case of the Quick Private Swap the only option is Private Solana to Solana Swap)

The user specifies a recipient address

The user then clicks the swap button. 

The user is then shown a wallet address they need to send the swap amount to

houdini swap then completes the swap and deposits the swapped amount to the recipient address minus the fee.

I want teh WHISPR Quick Private Swap to work in the following way:

User drags sender wallet into the source box of the Quick Private Transfer card

The user then has the option to either drag a recipient wallet into the destination box or to manually enter a recipient address.

User then clicks the swap button. 

houdini swap will need the swap amount sent to an external address, the User of WHISPR should never see this address or need to make the transfer. Instead WHISPR should move the funds from the sender wallet to the houdini swap address when the transfer button is clicked.

The houdiniswap transaction ID should be logged in the users historical swap data (this can be downloaded and sent to support if need be)

The houdiniswap api should then complete the swap and deposit the swapped amount to the recipient address minus the fee.

I want the user to be able to see the status of the swap in the UI however this needs to be a custom UI that you design, this needs to follow the theme of WHISPR and not look like a standard houdiniswap UI.

