import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  Program,
  AnchorProvider,
  web3,
  utils,
  BN,
} from '@project-serum/anchor';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
} from '@solana/spl-token';
import { CarbonCreditNft } from './carbon_credit_nft'; // 假設這是您的程式 IDL

// 設置連接和提供者
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = new Keypair(); // 在實際應用中，您應該使用真實的錢包
const provider = new AnchorProvider(connection, wallet, {});

// 載入程式
const programId = new PublicKey('YOUR_PROGRAM_ID_HERE');
const program = new Program(CarbonCreditNft, programId, provider);

async function mintNft() {
  // 創建新的 mint 賬戶
  const mintKeypair = Keypair.generate();
  const mintPubkey = mintKeypair.publicKey;

  // 計算 PDA 用於 NFT 賬戶
  const [nftAccount] = await PublicKey.findProgramAddress(
    [Buffer.from('nft'), mintPubkey.toBuffer()],
    programId
  );

  // 獲取接收者的關聯 token 賬戶地址
  const receiverPubkey = wallet.publicKey;
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mintPubkey,
    receiverPubkey
  );

  // 創建交易
  const tx = new Transaction();

  // 添加創建 mint 賬戶的指令
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintPubkey,
      space: 82,
      lamports: await connection.getMinimumBalanceForRentExemption(82),
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintPubkey,
      0,
      wallet.publicKey,
      wallet.publicKey
    )
  );

  // 添加創建關聯 token 賬戶的指令
  tx.add(
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      associatedTokenAddress,
      receiverPubkey,
      mintPubkey
    )
  );

  // 準備 NFT 元數據
  const nftMetadata = {
    carbonCreditSerial: 'CC001',
    carbonCreditType: 'Renewable Energy',
    projectName: 'Solar Farm Project',
    tco2eWeight: new BN(1000),
    issuer: 'Green Energy Co.',
    certificationBody: 'Carbon Standard',
    issueDate: new BN(Date.now() / 1000),
  };

  // 調用 mint_nft 指令
  await program.methods
    .mintNft(
      nftMetadata,
      'https://arweave.net/your-metadata-uri',
      'Carbon Credit NFT',
      'CCNFT'
    )
    .accounts({
      mint: mintPubkey,
      tokenAccount: associatedTokenAddress,
      mintAuthority: wallet.publicKey,
      payer: wallet.publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
      metadata: await getMetadataAddress(mintPubkey),
      masterEdition: await getMasterEditionAddress(mintPubkey),
      nftAccount,
    })
    .signers([wallet, mintKeypair])
    .rpc();

  console.log('NFT minted successfully!');
  console.log('Mint address:', mintPubkey.toBase58());
  console.log('Associated token address:', associatedTokenAddress.toBase58());
}

// 輔助函數：獲取元數據地址
async function getMetadataAddress(mint: PublicKey): Promise<PublicKey> {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
        mint.toBuffer(),
      ],
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    )
  )[0];
}

// 輔助函數：獲取主版本地址
async function getMasterEditionAddress(mint: PublicKey): Promise<PublicKey> {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
      ],
      new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    )
  )[0];
}

// 執行 mintNft 函數
mintNft().catch(console.error);
