'use client';

import { ChainList } from '@/config';
import { ChainId } from '@portkey/types';
import { Button, Divider, Input, Select } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { eTransferCore } from '@/utils/core';
import { BusinessType, PortkeyVersion } from '@etransfer/types';
import type { TNetworkItem, TTokenItem, TWithdrawInfo } from '@etransfer/services';

type TTokenItemForSelect = TTokenItem & {
  value: string;
  label: string;
};

export default function Withdraw() {
  const [currentChain, setCurrentChain] = useState<ChainId>(ChainList[1].value);
  const [tokenList, setTokenList] = useState<TTokenItem[]>([]);
  const [currentToken, setCurrentToken] = useState<string>('USDT');
  const [address, setAddress] = useState<string>('');
  const [networkList, setNetworkList] = useState<TNetworkItem[]>([]);
  const [currentNetwork, setCurrentNetwork] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [withdrawInfo, setWithdrawInfo] = useState<TWithdrawInfo>();
  const [withdrawResult, setWithdrawResult] = useState<boolean | undefined>(undefined);

  const transactionFee = useMemo(() => {
    return `${withdrawInfo?.transactionFee || '--'} ${withdrawInfo?.transactionUnit || ''} + ${
      withdrawInfo?.aelfTransactionFee || '--'
    } ${withdrawInfo?.aelfTransactionUnit || ''}`;
  }, [
    withdrawInfo?.aelfTransactionFee,
    withdrawInfo?.aelfTransactionUnit,
    withdrawInfo?.transactionFee,
    withdrawInfo?.transactionUnit,
  ]);

  const willReceive = useMemo(() => {
    return `${withdrawInfo?.receiveAmount || '--'} ${withdrawInfo?.limitCurrency || ''}`;
  }, [withdrawInfo?.limitCurrency, withdrawInfo?.receiveAmount]);

  const fetchNetworkList = useCallback(
    async (symbol?: string) => {
      try {
        const res = await eTransferCore.services.getNetworkList({
          type: BusinessType.Withdraw,
          chainId: currentChain,
          symbol: symbol || currentToken,
        });
        const list: any[] = JSON.parse(JSON.stringify(res.networkList)) || [];
        list.forEach(item => {
          item.label = item.network;
          item.value = item.network;
        });
        setNetworkList(list);
        setCurrentNetwork('');
      } catch (error) {
        console.error('fetchNetworkList', error);
      }
    },
    [currentChain, currentToken],
  );

  const fetchTokenList = useCallback(async () => {
    try {
      const res = await eTransferCore.services.getTokenOption({ type: BusinessType.Deposit });
      const tokenList: TTokenItemForSelect[] = JSON.parse(JSON.stringify(res.tokenList));
      tokenList.forEach(token => {
        token.value = token.symbol;
        token.label = token.symbol;
      });

      setTokenList(tokenList);
      setCurrentToken(tokenList[0].symbol);

      await fetchNetworkList(tokenList[0].symbol);
    } catch (error) {
      console.error('fetchTokenList', error);
    }
  }, [fetchNetworkList]);

  const fetchWithdrawInfo = useCallback(async () => {
    try {
      const res = await eTransferCore.services.getWithdrawInfo({
        chainId: currentChain,
        network: currentNetwork,
        symbol: currentToken,
        amount: amount,
        address: address,
        version: PortkeyVersion.v2,
      });
      setWithdrawInfo(res.withdrawInfo);
    } catch (error) {
      console.error('fetchWithdrawInfo', error);
    }
  }, [address, amount, currentChain, currentNetwork, currentToken]);

  const onChainChange = useCallback((val: ChainId) => {
    setCurrentChain(val);
  }, []);

  const onTokenChange = useCallback((val: string) => {
    setCurrentToken(val);
  }, []);

  const onAddressChange = useCallback((event: any) => {
    const value = event.target.value;
    setAddress(value);
  }, []);

  const onNetworkChange = useCallback((val: string) => {
    setCurrentNetwork(val);
  }, []);

  const onAmountAmount = useCallback((event: any) => {
    const value = event.target.value;
    setAmount(value);
  }, []);

  const onSubmit = useCallback(async () => {
    try {
      const res = await eTransferCore.services.createWithdrawOrder({
        network: currentNetwork,
        symbol: currentToken,
        amount: amount,
        fromChainId: currentChain,
        toAddress: address,
        rawTransaction: '',
      });
      if (res.orderId) {
        setWithdrawResult(true);
      } else {
        setWithdrawResult(false);
      }
    } catch (error) {
      setWithdrawResult(false);
    }
  }, [address, amount, currentChain, currentNetwork, currentToken]);

  return (
    <div>
      <h1 className="page-title">Withdraw Assets</h1>
      <Divider plain>First Step</Divider>
      <Button onClick={fetchTokenList}>Get Token Data</Button>
      <Button className="ml-2" onClick={() => fetchNetworkList()}>
        Get Network Data
      </Button>

      <Divider plain>Second Step</Divider>
      <section>
        <div className="space-y-2">
          <span className="form-label">Chain:</span>
          <Select value={currentChain} className="w-[200px]" onChange={onChainChange} options={ChainList} />
        </div>
        <div className="space-y-2">
          <span className="form-label">Token:</span>
          <Select value={currentToken} className="w-[200px]" onChange={onTokenChange} options={tokenList} />
        </div>
        <div className="space-y-2">
          <span className="form-label">Address:</span>
          <Input
            value={address}
            className="w-[200px]"
            onChange={onAddressChange}
            placeholder="Select the above first"
          />
        </div>
        <div className="space-y-2">
          <span className="form-label">Network:</span>
          <Select value={currentNetwork} className="w-[200px]" onChange={onNetworkChange} options={networkList} />
        </div>
        <div className="space-y-2">
          <span className="form-label">Amount:</span>
          <Input value={amount} className="w-[200px]" onChange={onAmountAmount} placeholder="Select the above first" />
        </div>

        <Button className="mt-2 mb-2" onClick={fetchWithdrawInfo}>
          Get Withdraw info
        </Button>
        <div>
          <span>
            <span>Transaction Fee:</span>
            <span className="text-brand-normal inline-block ml-2 mr-10">{transactionFee}</span>
          </span>

          <span>
            <span>Amount to Be Received:</span>
            <span className="text-brand-normal inline-block ml-2 mr-2">{willReceive}</span>
          </span>
        </div>
      </section>

      <Divider plain>Last Step</Divider>
      <Button className="mr-2" onClick={onSubmit}>
        Withdraw Assets
      </Button>
      {withdrawResult !== undefined && withdrawResult && (
        <span className="text-success-normal">Withdrawal Request Submitted</span>
      )}
      {withdrawResult !== undefined && !withdrawResult && <span className="text-error-normal">Transaction Failed</span>}
    </div>
  );
}
