import React, { useEffect, useState, useContext, useRef } from "react";
import {
  faArrowRotateRight,
  faCheck,
  faChevronDown,
  faChevronRight,
  faCircle,
  faGlobe,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Tooltip from "@mui/material/Tooltip";
import { APIContext } from "shared/context/APIContext";
import { usdString } from "shared/utils/commons";
import BigNumber from "bignumber.js";
import { formatNumber } from "shared/utils/commons";

interface IMyValidatorsItemProps {
  name: string;
  commissionPercentage: number;
  stakedAmount: number;
  identity?: string;
  setSelectedValidator: any;
  restakeEntries: any;
  validator: any;
  openModal: any;
}

const MyValidatorsItem = (props: IMyValidatorsItemProps) => {
  const stakedAmountString = BigNumber(props.stakedAmount!)
    .dividedBy(`1e6`)
    .toString();

  const { currentPrice, setCurrentPrice } = useContext(APIContext);

  const [imgUrl, setImgUrl] = useState<any>();

  const identityRef = useRef(props.identity);

  useEffect(() => {
    identityRef.current = props.identity;
    const fetchKeybaseImgUrl = async () => {
      const url = `https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${props.identity}&fields=pictures`;
      await fetch(url)
        .then((response) => response.json())
        .catch((e) => {})
        .then((response) => {
          if (identityRef.current === props.identity) {
            if (response?.them[0]) {
              setImgUrl(response?.them[0].pictures?.primary?.url);
            } else {
              setImgUrl(undefined);
            }
          }
        })
        .catch((e) => {});
    };
    if (props.identity) {
      setImgUrl(undefined);
      fetchKeybaseImgUrl();
    }
    console.log(
      props.restakeEntries.find(
        (validatorAddress: string) =>
          props.validator.validator_address === validatorAddress
      )
    );
  }, [props.identity, identityRef]);

  return (
    <>
      {/* Item */}
      <button
        onClick={() => {
          props.openModal(true);
          props.setSelectedValidator(props.validator);
        }}
        className="dark:even:bg-neutral-700 dark:odd:bg-neutral-800 flex items-center text-left dark:hover:bg-neutral-600 py-2.5 gap-4 pl-4 pr-8"
      >
        {/* Checkbox */}
        <div className="">
          <input type="checkbox" />
        </div>
        {/* Auto Restake */}
        <div className="auto-restake">
          {props.restakeEntries.find(
            (validatorAddress: string) =>
              props.validator.operator_address === validatorAddress
          ) && (
            <Tooltip title={"Auto restake is enabled"} placement="bottom" arrow>
              <div className="flex items-center">
                <span className="font-bold text-xs text-green-600">
                  {"Autorestake enabled"}
                </span>
              </div>
            </Tooltip>
          )}
          {!props.restakeEntries.find(
            (validatorAddress: string) =>
              props.validator.operator_address === validatorAddress
          ) && (
            <Tooltip
              title={"Auto restake is disabled"}
              placement="bottom"
              arrow
            >
              <div className="flex items-center">
                <span className="font-bold text-xs text-red-600">
                  {"Autorestake disabled"}
                </span>
              </div>
            </Tooltip>
          )}
          {/* <FontAwesomeIcon icon={faArrowRotateRight} /> */}
        </div>
        {/* Image */}
        <div className="image">
          {imgUrl ? (
            <>
              <img
                src={imgUrl}
                alt={`validator logo`}
                className="rounded-full w-10"
              />
            </>
          ) : (
            <>
              <div className="relative bg-blue-500 rounded-full w-10 h-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold">
                  {/* .charAt(0) or .slice(0,1) won't work here with emojis! */}
                  {[...props.name][0].toUpperCase()}
                </div>
              </div>
            </>
          )}
        </div>
        {/* Title */}
        <div className="flex-1">
          <span className="font-semibold">{props.name}</span>
          {props.validator?.description?.website && (
            <a
              href={props.validator?.description?.website}
              target="_blank"
              className="group font-medium text-sm"
            >
              <FontAwesomeIcon
                icon={faGlobe}
                size="sm"
                className="ml-3 mr-1 text-neutral-500 group-hover:text-white"
              />
              <span className="hidden group-hover:inline-block">Website</span>
            </a>
          )}
        </div>
        {props.validator.status === "BOND_STATUS_UNBONDED" && (
          <div className="border border-red-500 bg-transparent text-red-500 text-sm rounded px-4 py-2 cursor-not-allowed flex items-center justify-start">
            Inactive
          </div>
        )}
        <div className="staked-amount">
          <div>
            <span className="font-semibold">{stakedAmountString}</span>
            <span className="text-sm font-semibold text-neutral-400">
              {" "}
              SCRT
            </span>
          </div>
          <div className="text-sm font-semibold text-neutral-400">
            {usdString.format(
              new BigNumber(props.stakedAmount!)
                .dividedBy(`1e6`)
                .multipliedBy(Number(currentPrice))
                .toNumber()
            )}
          </div>
        </div>
        <div className="commission font-semibold">
          {formatNumber(props.commissionPercentage * 100, 2)}%
        </div>
        <div className="flex items-center font-semibold border-b border-white/0 hover:border-white transition-colors">
          <FontAwesomeIcon icon={faChevronRight} size="sm" className="ml-1" />
        </div>
      </button>
    </>
  );
};

export default MyValidatorsItem;
