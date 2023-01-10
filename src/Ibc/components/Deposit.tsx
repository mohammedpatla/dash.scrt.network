import {
  CircularProgress,
} from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import Select from 'react-select';
import { createTxIBCMsgTransfer } from "@tharsis/transactions";
import { cosmos } from "@tharsis/proto/dist/proto/cosmos/tx/v1beta1/tx";
import BigNumber from "bignumber.js";
import Long from "long";
import React, { useEffect, useRef, useState, useContext, Component} from "react";
import { KeplrContext, FeeGrantContext } from "General/Layouts/defaultLayout";
import { getKeplrViewingKey, setKeplrViewingKey } from "General/Components/Keplr";
import {
  sleep,
  suggestCrescentToKeplr,
  suggestChihuahuaToKeplr,
  suggestInjectiveToKeplr,
  suggestKujiraToKeplr,
  suggestTerraToKeplr,
  faucetAddress, 
  viewingKeyErrorString,
} from "General/Utils/commons";
import {
  fromBase64,
  SecretNetworkClient,
  toBase64,
  TxResponse,
  toUtf8
} from "secretjs";
import { chains, Token, tokens, snips } from "General/Utils/config";
import { TxRaw } from "secretjs/dist/protobuf/cosmos/tx/v1beta1/tx";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CopyToClipboard from "react-copy-to-clipboard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo, faCopy, faPaste, faRightLeft ,faKey} from "@fortawesome/free-solid-svg-icons";
import { IbcContext } from "Ibc/Ibc";

export default function Deposit () {
  const {isWrapModalOpen, setIsWrapModalOpen, selectedTokenName, setSelectedTokenName} = useContext(IbcContext);

  const [sourceAddress, setSourceAddress] = useState<string>("");
  const [availableBalance, setAvailableBalance] = useState<string>("");
  const [loadingTx, setLoading] = useState<boolean>(false);
  const [sourceChainSecretjs, setSourceChainSecretjs] = useState<SecretNetworkClient | null>(null);
  const [fetchBalanceInterval, setFetchBalanceInterval] = useState<any>(null);
  const [amountToTransfer, setAmountToTransfer] = useState<string>("");
  const {secretjs, secretAddress} = useContext(KeplrContext);
  const {useFeegrant, setUseFeegrant} = useContext(FeeGrantContext);

  const queryParams = new URLSearchParams(window.location.search);
  const tokenByQueryParam = queryParams.get("token"); // "scrt", "akash", etc.
  const chainByQueryParam = queryParams.get("chain"); // "scrt", "akash", etc.
  const [selectedToken, setSelectedToken] = useState<Token>(tokens.filter(token => token.name === 'SCRT')[0]);
  const sourcePreselection = selectedToken.deposits.filter(deposit => deposit.chain_name.toLowerCase() === chainByQueryParam?.toLowerCase())[0] ? chainByQueryParam?.toLowerCase() : "osmosis";
  const [selectedSource, setSelectedSource] = useState<any>(selectedToken.deposits.filter(deposit => deposit.chain_name.toLowerCase() === sourcePreselection)[0]);

  const tokenPreselection = tokens.filter(token => token.name === tokenByQueryParam?.toUpperCase())[0] ? tokenByQueryParam?.toUpperCase() : "INJ";

  useEffect(() => {
    setSelectedTokenName(selectedToken.name);
  }, [selectedToken]);

  enum IbcMode {
    Deposit,
    Withdrawal
  }

  const [ibcMode, setIbcMode] = useState<IbcMode>(IbcMode.Deposit);

  function toggleIbcMode() {
    if (ibcMode === IbcMode.Deposit) {
      setIbcMode(IbcMode.Withdrawal);
    } else {
      setIbcMode(IbcMode.Deposit);
    }
  }

  function handleInputChange(e: any) {
    setAmountToTransfer(e.target.value);
  }

  const message = (ibcMode === IbcMode.Deposit) ?
  `Deposit your SCRT via IBC transfer from ${selectedSource.chain_name} to Secret Network` :
  `Withdraw your SCRT via IBC transfer from Secret Network to ${selectedSource.chain_name}`



  class ChainSelect extends Component {
    render() {
      return <>
        <Select options={tokens.filter(token => token.name === 'SCRT')[0].deposits} value={selectedSource} onChange={setSelectedSource} isSearchable={false} isDisabled={!secretjs || !secretAddress}
                formatOptionLabel={option => (
                  <div className="flex items-center">
                    <img src={`/img/assets/${chains[option.chain_name].chain_image}`} className="w-6 h-6 mr-2 rounded-full" />
                    <span className="font-semibold text-sm">{option.chain_name}</span>
                  </div>
                )} className="react-select-container" classNamePrefix="react-select" />
      </>
    }
}

  // handles [25% | 50% | 75% | Max] Button-Group
  function setAmountByPercentage(percentage: number) {
    if (availableBalance) {
      let availableAmount = Number(availableBalance) * (10**(-selectedToken.decimals));
      let potentialInput = new BigNumber(availableAmount * (percentage * 0.01)).toFormat();
      if (Number(potentialInput) == 0) {
        setAmountToTransfer("");
      } else {
        setAmountToTransfer(potentialInput);
      }
    }
  }

  const updateCoinBalance = async () => {
    if (secretjs && secretAddress) {
      if (selectedToken.is_snip20) {
        
        const key = await getKeplrViewingKey(selectedToken.address);
        if (!key) {
          setAvailableBalance(viewingKeyErrorString);
          return;
        }

        try {
          const result: {
            viewing_key_error: any;
            balance: {
              amount: string;
            };
          } = await secretjs.query.compute.queryContract({
            contract_address: selectedToken.address,
            code_hash: selectedToken.code_hash,
            query: {
              balance: { address: secretAddress, key },
            },
          });

          if (result.viewing_key_error) {
            setAvailableBalance(viewingKeyErrorString);
            return;
          }

          setAvailableBalance(result.balance.amount);
        } catch (e) {
          console.error(`Error getting balance for s${selectedToken.name}`, e);

          setAvailableBalance(viewingKeyErrorString);
        }
      } else {
        try {
          const {
            balance: { amount },
          } = await secretjs.query.bank.balance({
            address: secretAddress,
            denom: selectedToken.withdrawals[0]?.from_denom,
          });
          setAvailableBalance(amount);
        } catch (e) {
          console.error(
            `Error while trying to query ${selectedToken.name}:`,
            e
          );
        }
      }
    }
  }

  const targetChain = chains["Secret Network"];

  const fetchSourceBalance = async (newAddress: String | null) => {
    if (secretjs && secretAddress) {
      if (ibcMode === IbcMode.Deposit) {
        const url = `${
          chains[selectedSource.chain_name].lcd
        }/cosmos/bank/v1beta1/balances/${
          newAddress ? newAddress : sourceAddress
        }`;
        try {
          const {
            balances,
          }: {
            balances: Array<{ denom: string; amount: string }>;
          } = await(await fetch(url)).json();

          const balance =
            balances.find(
              (c) =>
                c.denom ===
                selectedToken.deposits.filter(
                  (deposit) => deposit.chain_name === selectedSource.chain_name
                )[0].from_denom
            )?.amount || "0";
          setAvailableBalance(balance);
        } catch (e) {
          console.error(`Error while trying to query ${url}:`, e);
          setAvailableBalance("Error");
        }
      }
      else if (ibcMode === IbcMode.Withdrawal) {
        updateCoinBalance();
      }
    }
  };


  useEffect(() => {
    setAvailableBalance("");

    if (!sourceAddress) {
      return;
    }
    if (!(secretjs && secretAddress)) {
      return;
    }

    if (fetchBalanceInterval) {
      clearInterval(fetchBalanceInterval);
    }

    if (ibcMode === IbcMode.Withdrawal) {
      fetchSourceBalance(null);
    } 
    
    const interval = setInterval(
      () => fetchSourceBalance(null),
      10_000
    );
    setFetchBalanceInterval(interval);

    return () => clearInterval(interval);
  }, [selectedSource, selectedToken, sourceAddress, ibcMode, secretAddress, secretjs]);

  useEffect(() => {
    const possibleSnips = snips.filter(token => token.deposits.find(token => token.chain_name == selectedSource.chain_name)!);
    const possibleTokens = tokens.filter(token => token.deposits.find(token => token.chain_name == selectedSource.chain_name)!);
    const supportedTokens = possibleTokens.concat(possibleSnips);
    
    setSupportedTokens(supportedTokens);

    if (!supportedTokens.includes(selectedToken)) {
      setSelectedToken(supportedTokens[0]);
    }
    (async () => {
      while (!window.keplr || !window.getOfflineSignerOnlyAmino) {
        await sleep(100);
      }
      if (selectedSource.chain_name === "Terra") {
        await suggestTerraToKeplr(window.keplr);
      } else if (selectedSource.chain_name === "Injective") {
        await suggestInjectiveToKeplr(window.keplr);
      } else if (selectedSource.chain_name === "Crescent") {
        await suggestCrescentToKeplr(window.keplr);
      } else if (selectedSource.chain_name === "Kujira") {
        await suggestKujiraToKeplr(window.keplr);
      }else if (selectedSource.chain_name === "Chihuahua") {
        await suggestChihuahuaToKeplr(window.keplr);
      }

      // Initialize cosmjs on the source chain, because it has sendIbcTokens()
      const { chain_id, lcd, bech32_prefix } = chains[selectedSource.chain_name];
      await window.keplr.enable(chain_id);
      
      window.keplr.defaultOptions = {
        sign: {
            preferNoSetFee: false,
            disableBalanceCheck: true,
        }
      }

      const sourceOfflineSigner = window.getOfflineSignerOnlyAmino(chain_id);
      const depositFromAccounts = await sourceOfflineSigner.getAccounts();
      setSourceAddress(depositFromAccounts[0].address);

      
      const secretjs = new SecretNetworkClient({
        url: lcd,
        chainId: chain_id,
        wallet: sourceOfflineSigner,
        walletAddress: depositFromAccounts[0].address,
      });

      setSourceChainSecretjs(secretjs);

      fetchSourceBalance(depositFromAccounts[0].address);

    })()
  }, [selectedSource, selectedToken, sourceAddress, ibcMode, secretAddress, secretjs]);

  
  const [isCopied, setIsCopied] = useState<boolean>(false); 

  const [supportedTokens, setSupportedTokens] = useState<Token[]>([]);
    
  function uiFocusInput() {
    document.getElementById("inputWrapper")?.classList.add("animate__animated");
    document.getElementById("inputWrapper")?.classList.add("animate__headShake");
    setTimeout(() => {
      document.getElementById("inputWrapper")?.classList.remove("animate__animated");
      document.getElementById("inputWrapper")?.classList.remove("animate__headShake");
    }, 1000);
  }

  function SubmitButton() {
    async function submit() {
      // TODO: add validation to form, including message
      // if (!isValidAmount || amount === "") {
      //   uiFocusInput();
      //   return;
      // }

      if (ibcMode == IbcMode.Deposit) {
        if (!sourceChainSecretjs) {
          console.error("No cosmjs");
          return;
        }

        if (!amountToTransfer) {
          console.error("Empty deposit");
          return;
        }

        const normalizedAmount = (amountToTransfer as string).replace(
          /,/g,
          ""
        );

        if (!(Number(normalizedAmount) > 0)) {
          console.error(`${normalizedAmount} not bigger than 0`);
          return;
        }

        setLoading(true);

        const amount = new BigNumber(normalizedAmount)
          .multipliedBy(`1e${selectedToken.decimals}`)
          .toFixed(0, BigNumber.ROUND_DOWN);

        let {
          deposit_channel_id,
          deposit_gas,
          deposit_gas_denom,
          lcd: lcdSrcChain,
        } = chains[selectedSource.chain_name];

        deposit_channel_id = selectedSource.channel_id || deposit_channel_id;
        deposit_gas = selectedSource.gas || deposit_gas;

        const toastId = toast.loading(
          `Sending ${normalizedAmount} ${selectedToken.name} from ${selectedSource.chain_name} to Secret`,
          {
            closeButton: true,
          }
        );

        try {
          let tx: TxResponse;

          if (!["Evmos", "Injective"].includes(selectedSource.chain_name)) {
            // Regular cosmos chain (not ethermint signing)
            tx = await sourceChainSecretjs.tx.ibc.transfer(
              {
                sender: sourceAddress,
                receiver: secretAddress,
                source_channel: deposit_channel_id,
                source_port: "transfer",
                token: {
                  amount,
                  denom: selectedSource.from_denom,
                },
                timeout_timestamp: String(
                  Math.floor(Date.now() / 1000) + 10 * 60
                ), // 10 minute timeout
              },
              {
                gasLimit: deposit_gas,
                ibcTxsOptions: {
                  resolveResponsesCheckIntervalMs: 10_000,
                  resolveResponsesTimeoutMs: 10.25 * 60 * 1000,
                },
              }
            );
          } else {
            // Handle IBC transfers from Ethermint chains like Evmos & Injective


            // Get Evmos/Injective account_number & sequence
            const {
              account: {
                base_account: {
                  account_number: accountNumber,
                  sequence: accountSequence,
                },
              },
            }: {
              account: {
                base_account: {
                  account_number: string;
                  sequence: string;
                };
              };
            } = await (
              await fetch(
                `${chains[selectedSource.chain_name].lcd}/cosmos/auth/v1beta1/accounts/${sourceAddress}`
              )
            ).json();

            // Get account pubkey
            // Can't get it from the chain because an account without txs won't have its pubkey listed on-chain
            const evmosProtoSigner = window.getOfflineSigner!(
              chains[selectedSource.chain_name].chain_id
            );
            const [{ pubkey }] = await evmosProtoSigner.getAccounts();

            // Create IBC MsgTransfer tx
            const txIbcMsgTransfer = createTxIBCMsgTransfer(
              {
                chainId: 9001, // Evmos EIP155, this is ignored in Injective
                cosmosChainId: chains[selectedSource.chain_name].chain_id,
              },
              {
                accountAddress: sourceAddress,
                accountNumber: Number(accountNumber),
                sequence: Number(accountSequence),
                pubkey: toBase64(pubkey),
              },
              {
                gas: String(deposit_gas),
                amount: "0", // filled in by Keplr
                denom: "aevmos", // filled in by Keplr
              },
              "",
              {
                sourcePort: "transfer",
                sourceChannel: deposit_channel_id,
                amount,
                denom: selectedSource.from_denom,
                receiver: secretAddress,
                revisionNumber: 0,
                revisionHeight: 0,
                timeoutTimestamp: `${
                  Math.floor(Date.now() / 1000) + 10 * 60
                }000000000`, // 10 minute timeout (ns)
              }
            );

            if (chains[selectedSource.chain_name].chain_name === "Injective") {
              const signer_info =
                txIbcMsgTransfer.signDirect.authInfo.signer_infos[0].toObject();
              signer_info.public_key!.type_url =
                "/injective.crypto.v1beta1.ethsecp256k1.PubKey";

              txIbcMsgTransfer.signDirect.authInfo.signer_infos[0] =
                cosmos.tx.v1beta1.SignerInfo.fromObject(signer_info);
            }

            // Sign the tx
            const sig = await window?.keplr?.signDirect(
              chains[selectedSource.chain_name].chain_id,
              sourceAddress,
              {
                bodyBytes:
                  txIbcMsgTransfer.signDirect.body.serializeBinary(),
                authInfoBytes:
                  txIbcMsgTransfer.signDirect.authInfo.serializeBinary(),
                chainId: chains[selectedSource.chain_name].chain_id,
                accountNumber: new Long(Number(accountNumber)),
              },
              // @ts-expect-error the types are not updated on the Keplr types package
              { isEthereum: true }
            );

            // Encode the Evmos tx to a TxRaw protobuf binary
            const txRaw = TxRaw.fromPartial({
              body_bytes: sig!.signed.bodyBytes,
              auth_info_bytes: sig!.signed.authInfoBytes,
              signatures: [fromBase64(sig!.signature.signature)],
            });
            const txBytes = TxRaw.encode(txRaw).finish();

            // cosmjs can broadcast to Ethermint but cannot handle the response

            // Broadcast the tx to Evmos
            tx = await sourceChainSecretjs.tx.broadcastSignedTx(
              toBase64(txBytes),
              {
                ibcTxsOptions: {
                  resolveResponsesCheckIntervalMs: 10_000,
                  resolveResponsesTimeoutMs: 10.25 * 60 * 1000,
                },
              }
            );
          }

          if (tx.code !== 0) {
            toast.update(toastId, {
              render: `Failed sending ${normalizedAmount} ${selectedToken.name} from ${selectedSource.chain_name} to Secret: ${tx.rawLog}`,
              type: "error",
              isLoading: false,
            });
            return;
          } else {
            toast.update(toastId, {
              render: `Receiving ${normalizedAmount} ${selectedToken.name} on Secret from ${selectedSource.chain_name}`,
            });

            const ibcResp = await tx.ibcResponses[0];

            if (ibcResp.type === "ack") {
              toast.update(toastId, {
                render: `Received ${normalizedAmount} ${selectedToken.name} on Secret from ${selectedSource.chain_name}`,
                type: "success",
                isLoading: false,
                closeOnClick: true,
              });
            } else {
              toast.update(toastId, {
                render: `Timed out while waiting to receive ${normalizedAmount} ${selectedToken.name} on Secret from ${selectedSource.chain_name}`,
                type: "warning",
                isLoading: false,
              });
            }
          }
        } catch (e) {
          toast.update(toastId, {
            render: `Failed sending ${normalizedAmount} ${
              selectedToken.name
            } from ${
              selectedSource.chain_name
            } to Secret: ${e}`,
            type: "error",
            isLoading: false,
          });
        } finally {
          setLoading(false);
        }
      }
      if (ibcMode == IbcMode.Withdrawal) {
        if (!secretjs) {
          console.error("No secretjs");
          return;
        }

        if (!amountToTransfer) {
          console.error("Empty withdraw");
          return;
        }

        const normalizedAmount = (amountToTransfer as string).replace(
          /,/g,
          ""
        );

        if (!(Number(normalizedAmount) > 0)) {
          console.error(`${normalizedAmount} not bigger than 0`);
          return;
        }

        setLoading(true);

        const amount = new BigNumber(normalizedAmount)
          .multipliedBy(`1e${selectedToken.decimals}`)
          .toFixed(0, BigNumber.ROUND_DOWN);

        let {
          withdraw_channel_id,
          withdraw_gas,
          lcd: lcdDstChain,
        } = chains[selectedSource.chain_name];

        withdraw_channel_id = selectedSource.channel_id || withdraw_channel_id;
        withdraw_gas = selectedSource.gas || withdraw_gas;

        const toastId = toast.loading(
          `Sending ${normalizedAmount} ${selectedToken.name} from Secret to ${selectedSource.chain_name}`,
          {
            closeButton: true,
          }
        );

        try {

          let tx: TxResponse;

          if (selectedToken.is_snip20) {
            tx = await secretjs.tx.compute.executeContract(
              {
                contract_address: selectedToken.address,
                code_hash: selectedToken.code_hash,
                sender: secretAddress,
                msg: {
                  send: {
                    recipient:
                      "secret1tqmms5awftpuhalcv5h5mg76fa0tkdz4jv9ex4", // cw20-ics20
                    recipient_code_hash:
                      "f85b413b547b9460162958bafd51113ac266dac96a84c33b9150f68f045f2641",
                    amount,
                    msg: toBase64(
                      toUtf8(
                        JSON.stringify({
                          channel: withdraw_channel_id,
                          remote_address: sourceAddress,
                          timeout: 600, // 10 minute timeout
                        })
                      )
                    ),
                  },
                },
              },
              {
                gasLimit: withdraw_gas,
                gasPriceInFeeDenom: 0.1,
                feeDenom: "uscrt",
                feeGranter: useFeegrant ? faucetAddress : "",
                ibcTxsOptions: {
                  resolveResponsesCheckIntervalMs: 10_000,
                  resolveResponsesTimeoutMs: 10.25 * 60 * 1000,
                },
              }
            );
          } else {
            tx = await secretjs.tx.ibc.transfer(
              {
                sender: secretAddress,
                receiver: sourceAddress,
                source_channel: withdraw_channel_id,
                source_port: "transfer",
                token: {
                  amount,
                  denom: selectedToken.withdrawals.filter(withdraw => withdraw.chain_name === selectedSource.chain_name)[0].from_denom,
                },
                timeout_timestamp: String(
                  Math.floor(Date.now() / 1000) + 10 * 60
                ), // 10 minute timeout
              },
              {
                gasLimit: withdraw_gas,
                gasPriceInFeeDenom: 0.1,
                feeDenom: "uscrt",
                feeGranter: useFeegrant ? faucetAddress : "",
                ibcTxsOptions: {
                  resolveResponsesCheckIntervalMs: 10_000,
                  resolveResponsesTimeoutMs: 10.25 * 60 * 1000,
                },
              }
            );
          }

          if (tx.code !== 0) {
            toast.update(toastId, {
              render: `Failed sending ${normalizedAmount} ${selectedToken.name} from Secret to ${selectedSource.chain_name}: ${tx.rawLog}`,
              type: "error",
              isLoading: false,
            });
          } else {
            toast.update(toastId, {
              render: `Receiving ${normalizedAmount} ${selectedToken.name} on ${selectedSource.chain_name}`,
            });

            const ibcResp = await tx.ibcResponses[0];

            if (ibcResp.type === "ack") {
              toast.update(toastId, {
                render: `Received ${normalizedAmount} ${selectedToken.name} on ${selectedSource.chain_name}`,
                type: "success",
                isLoading: false,
                closeOnClick: true,
              });
            } else {
              toast.update(toastId, {
                render: `Timed out while waiting to receive ${normalizedAmount} ${selectedToken.name} on ${selectedSource.chain_name} from Secret`,
                type: "warning",
                isLoading: false,
              });
            }
          }
        } catch (e) {
          toast.update(toastId, {
            render: `Failed sending ${normalizedAmount} ${
              selectedToken.name
            } from Secret to ${
              selectedSource.chain_name
            }: ${e}`,
            type: "error",
            isLoading: false,
          });
        } finally {
          setLoading(false);
        }
      }

      
      setIsWrapModalOpen(true);
    }

    return (<>
      <button
        className={"flex items-center justify-center w-full py-2 rounded-lg transition-colors font-semibold bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:bg-neutral-500"}
        disabled={!secretjs || !secretAddress}
        onClick={() => submit()}>Execute Transfer </button>
    </>)
  }

  
  return (
    <>
      {/* [From|To] Picker */}
      <div className="flex flex-col md:flex-row mb-8">
        {/* *** From *** */}
        <div className="flex-initial w-full md:w-1/3">
          {/* circle */}
          <div className="w-full relative rounded-full overflow-hidden border-2 border-cyan-500 hidden md:block" style={{paddingTop: '100%'}}>
            <div className="img-wrapper absolute top-1/2 left-0 right-0 -translate-y-1/2 text-center">
              <div className="w-1/2 inline-block">
                <div className="relative">
                  <div className={`absolute inset-0 bg-cyan-500 blur-md rounded-full overflow-hidden ${(secretjs && secretAddress) ? "fadeInAndOutLoop" : "opacity-40"}`}></div>
                  <img src={"/img/assets/" + (ibcMode === IbcMode.Deposit ? chains[selectedSource.chain_name].chain_image : "scrt.svg")} className="w-full relative inline-block rounded-full overflow-hiden" />
                </div>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 text-center text-sm font-bold text-white" style={{bottom: '10%'}}>From</div>
          </div>
          {/* Chain Picker */}
          <div className="-mt-3 relative z-10 w-full">
          {/* {value} */}
          {ibcMode === IbcMode.Deposit && (<ChainSelect/>)}
            {ibcMode === IbcMode.Withdrawal && (
              <div style={{paddingTop: ".76rem", paddingBottom: ".76rem"}} className="flex items-center w-full text-sm font-semibold select-none bg-neutral-800 rounded text-neutral-200 focus:bg-neutral-700 disabled:hover:bg-neutral-800 border border-neutral-600">
                <div className="flex-1 px-3">
                  <span>Secret Network</span>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* <div className="text-center sm:mt-6 sm:mb-2 my-6">
          <Tooltip title={`Switch to ${wrappingMode === WrappingMode.Wrap ? "Unwrapping" : "Wrapping"}`} placement="bottom">
            <button onClick={() => toggleWrappingMode()} disabled={disabled} className={"bg-neutral-900 px-3 py-2 text-blue-600 transition-colors rounded-full" + (!disabled ? " hover:text-blue-400 focus:text-blue-600" : "")}>
              <FontAwesomeIcon icon={faRightLeft} className="fa-rotate-90" />
            </button>
          </Tooltip>
        </div> */}
        <div className="flex-1 py-2 md:py-0">
          <div className="md:relative" id="ibcSwitchButton">
            <div className="md:absolute md:top-1/2 md:left-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 text-center md:text-left">
              <Tooltip title={`Switch chains`} placement="bottom" disableHoverListener={!secretjs && !secretAddress} arrow>
                <button onClick={toggleIbcMode} className={"inline-block bg-neutral-800 px-3 py-2 text-cyan-500 transition-colors rounded-xl disabled:text-neutral-500" + ((secretjs && secretAddress) ? " hover:text-cyan-300" : "")} disabled={!secretjs || !secretAddress}>
                  <FontAwesomeIcon icon={faRightLeft} className="rotate-90 md:rotate-0" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
        {/* *** To *** */}
        <div className="flex-initial w-full md:w-1/3">
          <div className="w-full relative rounded-full overflow-hidden border-2 border-violet-500 hidden md:block" style={{paddingTop: '100%'}}>
            <div className="img-wrapper absolute top-1/2 left-0 right-0 -translate-y-1/2 text-center">
              <div className="w-1/2 inline-block">
                <div className="relative">
                <div className={`absolute inset-0 bg-violet-500 blur-md rounded-full overflow-hidden ${(secretjs && secretAddress) ? "fadeInAndOutLoop" : "opacity-40"}`}></div>
                  <img src={"/img/assets/" + (ibcMode === IbcMode.Withdrawal ? chains[selectedSource.chain_name].chain_image : "scrt.svg")} className="w-full relative inline-block rounded-full overflow-hiden" />
                </div>
              </div>
            </div>
            <div className="absolute left-0 right-0 text-center text-sm font-bold text-white" style={{bottom: '10%'}}>To</div>
          </div>
          {/* Chain Picker */}
          <div className="md:-mt-3 md:relative z-10 w-full">
            {ibcMode === IbcMode.Withdrawal && (<ChainSelect/>)}
            {ibcMode === IbcMode.Deposit && (
              <div style={{paddingTop: ".76rem", paddingBottom: ".76rem"}} className="flex items-center w-full text-sm font-semibold select-none bg-neutral-800 rounded text-neutral-200 focus:bg-neutral-700 disabled:hover:bg-neutral-800 border border-neutral-600">
                <div className="flex-1 px-3">
                  <span>Secret Network</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      

      <div className="bg-neutral-800 p-4 rounded-xl space-y-6 my-4">
        <div className="flex items-center">
          <div className="font-semibold mr-4 w-10">From:</div>
          <div className="flex-1 truncate font-medium text-sm">
            {(ibcMode === IbcMode.Deposit && secretjs && secretAddress) && (
              <a href={`${chains[selectedSource.chain_name].explorer_account}${sourceAddress}`} target="_blank">{sourceAddress}</a>
            )}
            {(ibcMode === IbcMode.Withdrawal && secretjs && secretAddress) && (
              <a href={`${chains[selectedSource.chain_name].explorer_account}${secretAddress}`} target="_blank">{secretAddress}</a>
            )}
          </div>
          <div className="flex-initial ml-4">
            <CopyToClipboard
              text={ibcMode === IbcMode.Deposit ? sourceAddress : secretAddress}
              onCopy={() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 3000);
                toast.success("Address copied to clipboard!");
              }}
            >
              <Tooltip title={"Copy to clipboard"} placement="bottom" disableHoverListener={!secretjs && !secretAddress} arrow>
                  <button className="text-neutral-500 enabled:hover:text-white enabled:active:text-neutral-500 transition-colors" disabled={!secretjs && !secretAddress}>
                  <FontAwesomeIcon icon={faCopy}/>
                </button>
              </Tooltip>
            </CopyToClipboard>
          </div>
        </div>

        <div className="flex items-center">
          <div className="flex-initial font-semibold mr-4 w-10">To:</div>
          <div className="flex-1 truncate font-medium text-sm">
            {ibcMode === IbcMode.Withdrawal && (
                <a href={`${chains[selectedSource.chain_name].explorer_account}${sourceAddress}`} target="_blank">{sourceAddress}</a>
              )}
              {ibcMode === IbcMode.Deposit && (
                <a href={`${targetChain.explorer_account}${secretAddress}`} target="_blank">{secretAddress}</a>
              )}
          </div>
          <div className="flex-initial ml-4">
              <CopyToClipboard
                text={ibcMode === IbcMode.Withdrawal ? sourceAddress : secretAddress}
                onCopy={() => {
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 3000);
                  toast.success("Address copied to clipboard!");
                }}
              >
                <Tooltip title={"Copy to clipboard"} placement="bottom" disableHoverListener={!secretjs && !secretAddress} arrow>
                  <button className="text-neutral-500 enabled:hover:text-white enabled:active:text-neutral-500 transition-colors" disabled={!secretjs && !secretAddress}>
                    <FontAwesomeIcon icon={faCopy}/>
                  </button>
                </Tooltip>
              </CopyToClipboard>
          </div>
        </div>
      </div>



      <div className="bg-neutral-800 p-4 rounded-xl">
        <div className="flex" id="inputWrapper">
          <Select options={supportedTokens} value={selectedToken} onChange={setSelectedToken} isDisabled={!secretjs || !secretAddress} formatOptionLabel={token => (
                  <div className="flex items-center">
                    <img src={`/img/assets/${token.image}`} className="w-6 h-6 mr-2 rounded-full" />
                    <span className="font-semibold text-sm">
                      {token.name}
                    </span>
                  </div>
                )}  className="react-select-wrap-container" classNamePrefix="react-select-wrap"/>
          <input type="text" value={amountToTransfer} onChange={handleInputChange} className={"text-right focus:z-10 block flex-1 min-w-0 w-full bg-neutral-900 text-white px-4 rounded-r-lg disabled:placeholder-neutral-700 transition-colors font-medium" + (false ? "  border border-red-500" : "")} name="amount" id="amount" placeholder="0" disabled={!secretAddress}/>
        </div>

        {/* Balance | [25%|50%|75%|Max] */}
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 mt-3">
          <div className="flex-1 text-xs">
            <span className="font-semibold">Available: </span>
            <span className="font-medium">
              {(() => {
                if (availableBalance === "" && sourceAddress && secretjs) {return <CircularProgress size="0.6em" />;}
                const prettyBalance = new BigNumber(availableBalance).dividedBy(`1e${selectedToken.decimals}`).toFormat();
                if (prettyBalance === "NaN" && availableBalance === viewingKeyErrorString) {
                  return <button
                    className="ml-2 font-semibold bg-neutral-900 px-1.5 py-0.5 rounded-md border-neutral-700 transition-colors hover:bg-neutral-700 focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 disabled:hover:bg-neutral-900 disabled:cursor-default"
                    onClick={async () => {
                      await setKeplrViewingKey(selectedToken.address);
                      try {
                        setAvailableBalance("")
                        //setLoadingTokenBalance(true);
                        await sleep(1000); // sometimes query nodes lag
                        await updateCoinBalance();
                      } finally {
                        //setLoadingTokenBalance(false);
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faKey} className="mr-2" />
                    Set Viewing Key
                  </button>;
                }
                if (!secretAddress && !secretjs) {return "";}
                if (prettyBalance === "NaN") {return "Error";}
                return `${prettyBalance} ${selectedToken.name}`;
              })()}
            </span>
          </div>
          <div className="sm:flex-initial text-xs">
            <div className="inline-flex rounded-full text-xs font-semibold">
              <button onClick={() => setAmountByPercentage(25)} className="bg-neutral-900 px-1.5 py-0.5 rounded-l-md transition-colors hover:bg-neutral-700 focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 disabled:hover:bg-neutral-900 disabled:cursor-default" disabled={!secretAddress}>25%</button>
              <button onClick={() => setAmountByPercentage(50)} className="bg-neutral-900 px-1.5 py-0.5 border-l border-neutral-700 transition-colors hover:bg-neutral-700 focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 disabled:hover:bg-neutral-900 disabled:cursor-default" disabled={!secretAddress}>50%</button>
              <button onClick={() => setAmountByPercentage(75)} className="bg-neutral-900 px-1.5 py-0.5 border-l border-neutral-700 transition-colors hover:bg-neutral-700 focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 disabled:hover:bg-neutral-900 disabled:cursor-default" disabled={!secretAddress}>75%</button>
              <button onClick={() => setAmountByPercentage(100)} className="bg-neutral-900 px-1.5 py-0.5 rounded-r-md border-l border-neutral-700 transition-colors hover:bg-neutral-700 focus:bg-neutral-500 cursor-pointer disabled:text-neutral-500 disabled:hover:bg-neutral-900 disabled:cursor-default" disabled={!secretAddress}>MAX</button>
            </div>
          </div>
        </div>

      </div>


      {/* <div className="bg-neutral-900 p-4 mt-8 rounded-lg select-none flex items-center mb-8">
        <FontAwesomeIcon icon={faCircleInfo} className="flex-initial mr-4" />
        <div className="flex-1 text-sm">
          {message}
        </div>
      </div> */}


        <div className="mt-4">
          <SubmitButton/>
        </div>
    </>
  );
}