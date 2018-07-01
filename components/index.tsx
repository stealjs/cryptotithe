import * as classnames from 'classnames';
import * as React from 'react';
import {
    IHoldings,
    IPartialSavedData,
    ISavedData,
    ITradeWithDuplicateProbability,
    ITradeWithUSDRate,
} from '../src/types';
import { AddTrades } from './AddTrades';
import Button from './Button';
import { CalculateGains } from './CalculateGains';
import { FileBrowse } from './FileBrowse';
import { FileDownload, IFileDownloadProps } from './FileDownload';
import Popup from './Popup';
import { ViewTrades } from './ViewTrades';

export interface IAppProps {
    trades: ITradeWithUSDRate[];
    holdings: IHoldings;
    browser: boolean;
}

enum TABS {
    HOME = 'Home',
    VIEW_TRADES = 'View Trades',
    ADD_TRADES = 'Add Trades',
    CALCULATE_GAINS = 'Calculate Gains',
}

interface IAppState {
    trades: ITradeWithUSDRate[];
    processing: boolean;
    holdings: IHoldings;
    duplicateTrades: ITradeWithDuplicateProbability[];
    currentTab: TABS;
    loadDataPopup: boolean;
    fileBrowseOpen: boolean;
    downloadProps: IFileDownloadProps;
}

export class rootElement extends React.Component<IAppProps, IAppState> {
    public constructor(props: IAppProps) {
        super(props);
        this.state = {
            trades: this.props.trades,
            holdings: this.props.holdings,
            processing: false,
            duplicateTrades: [],
            currentTab: TABS.HOME,
            fileBrowseOpen: false,
            loadDataPopup: props.browser && props.trades.length + Object.keys(props.holdings).length === 0,
            downloadProps: {
                data: '',
                fileName: 'data.json',
                download: false,
            },
        };
    }

    public saveData = async (data: IPartialSavedData): Promise<boolean> => {
        const newHoldings = data.holdings || this.state.holdings;
        const newTrades = data.trades || this.state.trades;
        try {
            const savedData: ISavedData = {
                savedDate: new Date(),
                trades: newTrades,
                holdings: newHoldings,
            };
            this.setState({
                trades: newTrades,
                holdings: newHoldings,
                downloadProps: {
                    data: JSON.stringify(savedData),
                    fileName: 'data.json',
                    download: true,
                },
            });
            return true;
        } catch (err) {
            alert(err);
            return false;
        }
    }

    public componentDidUpdate() {
        if (this.state.downloadProps.download) {
            this.setState({
                downloadProps: {
                    data: '',
                    fileName: 'data.json',
                    download: false,
                },
            });
        }
    }

    public showCurrentTab = (currentTab: TABS) => {
        switch (currentTab) {
            case TABS.ADD_TRADES:
                return <AddTrades
                    holdings={this.state.holdings}
                    trades={this.state.trades}
                    save={this.saveData}
                />;
            case TABS.VIEW_TRADES:
                return <ViewTrades holdings={this.state.holdings} trades={this.state.trades} save={this.saveData}/>;
            case TABS.CALCULATE_GAINS:
                return <CalculateGains trades={this.state.trades} holdings={this.state.holdings}/>;
            case TABS.HOME:
                return ;
            default:
                return ;
        }
    }

    public updateTab = (newTab: TABS) => () => {
        this.setState({currentTab: newTab});
    }

    public changePopupState = () => {
        this.setState({loadDataPopup: !this.state.loadDataPopup});
    }

    public loadData = (data: string) => {
        this.setState({fileBrowseOpen: false});
        if (data !== '') {
            try {
                const parsedData: ISavedData = JSON.parse(data);
                this.setState({
                    trades: parsedData.trades,
                    holdings: parsedData.holdings,
                    loadDataPopup: false,
                });
            } catch (ex) {
                alert('Unable to parse saved data');
            }
        }
    }

    public openFileBrowse = () => {
        this.setState({fileBrowseOpen: true});
    }

    public render() {
        return (
            <div className='app'>
                {this.state.loadDataPopup &&
                    <Popup onClose={this.changePopupState}>
                        <div>
                            <h1>Welcome to CryptoTithe</h1>
                            <h5>Great Description to be put here</h5>
                            <Button label='Load Existing Data' onClick={this.openFileBrowse}/>
                            <FileBrowse
                                onLoaded={this.loadData}
                                browse={this.state.fileBrowseOpen}
                            />
                        </div>
                    </Popup>
                }
                { this.state.downloadProps &&
                    <FileDownload
                        data={this.state.downloadProps.data}
                        fileName={this.state.downloadProps.fileName}
                        download={this.state.downloadProps.download}
                    />
                }
                <link rel='stylesheet' type='text/css' href='./components/index.css' />
                <div className='flex bg-dark-gray h2'>
                    {Object.keys(TABS).map((key: string) => <h3
                        key={key}
                        className={classnames('pr2 pl2 ml2 mr2 moon-gray grow mt1 mb0', {
                            'bg-dark-gray': TABS[key] !== this.state.currentTab,
                            'bg-navy': TABS[key] === this.state.currentTab,
                        })}
                        onClick={this.updateTab(TABS[key])}
                    >{TABS[key]}</h3>)}
                </div>
                <div className='openTab'>
                    {this.showCurrentTab(this.state.currentTab)}
                </div>
            </div>
        );
    }
}
