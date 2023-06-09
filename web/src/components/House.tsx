import { FC, useEffect, useState } from 'react'
import Header from '@/components/Header'

import ThemeSwitcher from '@/components/ThemeSwitcher'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi'
import nftABI from '@/abi/NFTAbi.json'
import registeryABI from '@/abi/RegistryAbi.json'
import marketPlaceabi from '@/abi/MarketAbi.json'
import { $purify } from '@kodadot1/minipfs'
import { articles } from '@/articels/articles'
import { useAccount } from 'wagmi'

import Link from 'next/link'

const NFT_CONTRACT_ADDRESS = '0x9dfef6f53783c7185c69f45a51bede2c32e4ac3e'
const REGISTERY_CONTRACT_ADDRESS = '0x02101dfB77FDE026414827Fdc604ddAF224F0921'
const MARKETPLACE_CONTRACT_ADDRESS = '0xb1f3961d288696938f8976af6260aa24c6ea3c61'
const IMPLEMENTATION = '0x60c9D9798f43eDf78650d6Ff829F574243f1AA01'
const SALT = 20

const etherScanBaseUrl = 'https://goerli.etherscan.io/address/'

const House: FC<{ id: number }> = ({ id }) => {
	const [publication, setPublication] = useState(null)
	const [houseAddress, setHouseAddress] = useState(null)
	const [owner, setOwner] = useState(null)
	const [isApproved, setIsApproved] = useState(false)
	const [listingPrice, setListingPrice] = useState(0.3)
	const [price, setPrice] = useState<number>(null)
	const [seller, setSeller] = useState(null)

	const { address, isConnecting, isDisconnected, isConnected } = useAccount()

	const getEtherScanLink = (address: string) => {
		return `${etherScanBaseUrl}${address}`
	}

	const nftContract = {
		addressOrName: NFT_CONTRACT_ADDRESS,
		contractInterface: nftABI,
	}
	const { data: nftData } = useContractRead({
		...nftContract,
		functionName: 'tokenURI',
		args: [id],
	})

	const { data: ownerAddress } = useContractRead({
		...nftContract,
		functionName: 'ownerOf',
		args: [id],
	})

	const { data: registeryData } = useContractRead({
		addressOrName: REGISTERY_CONTRACT_ADDRESS,
		functionName: 'account',
		args: [IMPLEMENTATION, 5, NFT_CONTRACT_ADDRESS, id, SALT],
		contractInterface: registeryABI,
	})

	const isOwner = owner === address

	const { data: addressOfApprovee } = useContractRead({
		...nftContract,
		functionName: 'getApproved',
		args: [id],
	})

	const { data: listing } = useContractRead({
		addressOrName: MARKETPLACE_CONTRACT_ADDRESS,
		contractInterface: marketPlaceabi,
		functionName: 'getListing',
		args: [NFT_CONTRACT_ADDRESS, id],
	})

	useEffect(() => {
		console.log('listing object:', listing)
		if (listing && Array.isArray(listing) && listing[0] && listing[1]) {
			// Assuming that listing[0] is a price object and listing[1] is the seller address
			const priceInWei = BigInt(listing[0]._hex)
			const priceInEth = Number(priceInWei) / 10 ** 18
			console.log('priceInEth:', priceInEth)

			setPrice(priceInEth)
			setSeller(listing[1])
		} else {
			// If listing is null or does not have the expected shape, reset the state
			setPrice(null)
			setSeller(null)
		}
	}, [listing])

	const { config } = usePrepareContractWrite({
		...nftContract,
		functionName: 'approve',
		args: [MARKETPLACE_CONTRACT_ADDRESS, id],
	})
	const { write: writeApproveTransfer } = useContractWrite(config)

	const { config: listForSellConfig } = usePrepareContractWrite({
		addressOrName: MARKETPLACE_CONTRACT_ADDRESS,
		contractInterface: marketPlaceabi,
		functionName: 'listItem',
		args: [NFT_CONTRACT_ADDRESS, id, BigInt(listingPrice * 10 ** 18).toString()],
	})

	const { write: writeListForSell } = useContractWrite(listForSellConfig)

	const handleListForSell = async () => {
		try {
			const result = await writeListForSell()
			console.log(result)
		} catch (error) {
			console.error('List for sell failed', error)
		}
	}

	const handleApprove = async () => {
		try {
			// Write to contract (in this case, approving something). Note, the `write` function is already destructured from useContractWrite hook.
			const result = await writeApproveTransfer()
			// Log the result or handle it as per your need
			console.log(result)
			setIsApproved(true)
		} catch (error) {
			// Handle error
			console.error('Approval failed', error)
		}
	}


    const { config: buyItemConfig } = usePrepareContractWrite({
        addressOrName: MARKETPLACE_CONTRACT_ADDRESS,
        contractInterface: marketPlaceabi,
        functionName: 'buyItem',
        args: [NFT_CONTRACT_ADDRESS, id],
    });
    const { write: writeBuyItem } = useContractWrite(buyItemConfig);

    
    const handleBuy = async () => {
        try {
            // Write to contract (in this case, buying an item). Note, the `write` function is already destructured from useContractWrite hook.
            const result = await writeBuyItem();
            // Log the result or handle it as per your need
            console.log(result);
        } catch (error) {
            // Handle error
            console.error('Purchase failed', error);
        }
    };

    const onSubmmitBtnClick = async () => {
        if (isOwner) {
            await handleListForSell();
        } else {
            await handleBuy();
        }
    }
    

	useEffect(() => {
		if (registeryData) {
			setHouseAddress(registeryData)
		}
	}, [registeryData])

	useEffect(() => {
		if (ownerAddress) {
			setOwner(ownerAddress)
		}
	}, [ownerAddress])

	useEffect(() => {
		if (nftData) {
			console.log('nftData', nftData)
			const uri = $purify(nftData as unknown as string)

			fetch(uri[0] as unknown as string)
				.then(response => response.json())
				.then(fetchedData => {
					const cleanImage = $purify(fetchedData.image as unknown as string)
					fetchedData.image = cleanImage[0] as unknown as string
					setPublication(fetchedData)
				})
				.catch(err => {
					console.error('Failed to fetch publication', err)
				})
		}
	}, [nftData])

	const isSubmitBtnEnabled = () => {
		if (isOwner) {
			return Boolean(addressOfApprovee) && isConnected
		} else {
			return isConnected
		}
	}

	const submitBtnText = isOwner ? 'List' : 'Buy'

	// If id or data is not available, return loading text
	if (!publication) {
		return <div>Loading...</div>
	}
	return (
		<div className="relative flex items-top justify-center min-h-screen bg-gray-100 dark:bg-gray-900 sm:items-center py-4 sm:pt-0">
			<div className="w-full absolute top-0">
				<Header />
			</div>
			<ThemeSwitcher className="absolute bottom-6 right-6" />
			<div className="container mx-auto p-4 py-20">
				<div className="w-full py-10">
					{/* Banner Image */}
					<div className="w-full h-250 relative overflow-hidden rounded-t-lg">
						<Image
							src={publication.image || ''}
							alt={publication.name}
							// fill={true}
							layout="fill"
							objectFit="cover"
							className="object-contain"
						/>
						
					</div>
					
					{/* Info Section */}
					<div className="flex bg-[#16392D] rounded-b-lg text-white p-7 justify-between items-start">
						<div>
							<div className="text-3xl font-dela-gothic text-[#84EDA6]">{publication.name}</div>
							<div className="mt-2 max-w-md text-[#A1BBAB]">{publication.description}</div>
							<div className="mt-2">
								<span>Owner:</span>{' '}
								<a className="text-blue-500 underline" href={getEtherScanLink(owner)}>
									{owner}
								</a>
							</div>
							{price && seller ? (
								<div className="mt-2">Price: {price} ETH</div>
							) : (
								<div className="mt-2">Not for sale</div>
							)}

							<div className="mt-2">
								<span>Approvee: {addressOfApprovee}</span> <span>House Address:</span>{' '}
								<a className="text-blue-500 underline" href={getEtherScanLink(houseAddress)}>
									{houseAddress}
								</a>
							</div>
							{/* <div className="mt-2">Price: ${publication.price.toFixed(2)}</div> */}
						</div>
						<div>
							<button
								className={`bg-blue-500 text-white px-4 py-2 rounded ${
									!isConnected || !isOwner ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
								}`}
								onClick={handleApprove}
							>
								Approve
							</button>
							<button
								className={`bg-blue-500 text-white px-4 py-2 rounded ${
									!isSubmitBtnEnabled() ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
								}`}
								onClick={onSubmmitBtnClick}
							>
								{submitBtnText}
							</button>{' '}
							<input
								type="number"
                                step={0.001}
								value={listingPrice}
								onChange={e => setListingPrice(Number(e.target.value))}
								placeholder="Enter price"
								className="border rounded-md px-2 py-1 mr-2"
							/>
						</div>
					</div>
					{/* Articles Section */}
					<div className="mt-6">
						<h2 className="text-xl font-semibold mb-2">Articles:</h2>
						{articles.map((article, index) => (
							<div key={index} className="flex items-start space-x-4">
								{/* Article Image */}
								<div className="w-1/3">
									<Link href={`/house/${id}/article/${index}`}>
										<a className="block">
											<img
												src={$purify(article.image)[0]}
												alt={article.name}
												className="rounded-md max-w-full h-auto"
											/>
										</a>
									</Link>
								</div>
								{/* Article Information */}
								<div className="w-2/3">
									<Link href={`/house/${id}/article/${index}`}>
										<a className="block">
											<h3 className="font-bold text-2xl">{article.name}</h3>
											<p className="text-sm text-gray-500 mb-2">created by:</p>
											<div className="text-base">{article.content}</div>
											{/* Tags */}
											<div className="mt-2">
												<span className="font-semibold">Tags:</span>
												<ul className="inline-block pl-2">
													{article.tags.map((tag, index) => (
														<li
															key={index}
															className="inline-block mr-2 text-sm bg-gray-200 rounded-full px-2"
														>
															{tag}
														</li>
													))}
												</ul>
											</div>{' '}
										</a>
									</Link>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

export default House
