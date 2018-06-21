// This component tracks and modifies application data.
// It uses the React Context API.

import React, { createContext } from 'react';
import PropTypes from 'prop-types';

import Spark from 'spark-md5';
import { set, get } from 'idb-keyval';

import { games } from '../db/gameboy.js';

import { pause, run } from '../cores/GameBoy-Online/js/index';

const { Provider, Consumer } = createContext();

export default class Store extends React.Component {
  constructor() {
    super();

    this.state = {
      settingsOpen: false,
      libraryOpen: false,
      library: [],
      playingROM: ``,
      settings: {}
    };

    this.actions = {
      setCanvas: (canvas)=> {
        this.setState({ canvas });
      },

      runGame: (playingROM)=> {
        this.setState({
          playingROM,
          libraryOpen: false
        });

        run();
      },

      setCurrentROM: (currentROM)=> {
        this.setState({ currentROM });
      },

      toggleDrawer: (drawerName)=> ()=> {
        this.setState(
          { [`${drawerName}Open`]: !this.state[`${drawerName}Open`] },

          ()=> {
            if(this.state[`${drawerName}Open`]) {
              pause();
            } else {
              run();
            }
          }
        );
      },

      addToLibrary: (ROM, callback)=> {
        if(!ROM.length) {
          return;
        }

        const roms = Array.isArray(ROM) ? ROM : [ROM];

        for(const rom of roms) {
          const { md5 } = rom;

          for(const { libMd5 } of this.state.library) {
            if(md5 === libMd5) {
              return;
            }
          }
        }

        this.setState({
          library: [
            ...this.state.library,
            ...roms
          ]
        }, callback);
      },

      uploadGame: (e)=> {
        const getROM = (file)=> new Promise((resolve, reject)=> {
          const reader = new FileReader();

          const buffer = new Spark.ArrayBuffer();
          let rom = ``;

          reader.onload = (re)=> {
            if(typeof re.target.result === `object`) {
              buffer.append(re.target.result);

              reader.readAsBinaryString(file);
            } else {
              rom = re.target.result;
            }

            if(buffer._length && rom.length) {
              const md5 = buffer.end().toUpperCase();

              resolve({
                title: games[md5] || file.name,
                md5,
                rom
              });
            }
          };

          reader.onerror = (err)=> {
            reject(err);
          };

          reader.readAsArrayBuffer(file);
        });

        const roms = [];

        for(const file of e.target.files) {
          roms.push(getROM(file));
        }

        Promise.all(roms).then((results)=> {
          this.actions.addToLibrary(
            results,
            ()=> {
              set(`games`, JSON.stringify(this.state.library));
            }
          );
        });
      },

      updateSetting: (key, value)=> {
        this.setState(
          {
            settings: {
              ...this.state.settings,
              [key]: value
            }
          },

          ()=> {
            set(`settings`, JSON.stringify(this.state.settings));
          }
        );
      },

      hydrateSettings: ()=> {
        get(`settings`).then((settings = {})=> {
          this.setState({ settings });
        });
      }
    };
  }

  render() {
    return (
      <Provider value={{
        state: this.state,
        actions: this.actions
      }}>
        {this.props.children}
      </Provider>
    );
  }
}

Store.propTypes = { children: PropTypes.element };

export { Consumer };