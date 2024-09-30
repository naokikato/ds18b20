/**
* このファイルを使って、独自の関数やブロックを定義してください。
* 詳しくはこちらを参照してください：https://makecode.microbit.org/blocks/custom
*/

enum MyEnum {
    //% block="one"
    One,
    //% block="two"
    Two
}

/**
 * Custom blocks
 */
//% weight=100 color=#0fbc11 icon="" block="水温計"
namespace IMLwatertemp {

    // DS18B20センサーが接続されているピン (GROVEインタフェースの1ピンを指定)
    let oneWirePin = DigitalPin.P0

    // センサーのROMコマンドと機能コマンド
    let CONVERT_T = 0x44
    let READ_SCRATCHPAD = 0xBE

    //% block
    //% block="水温 %pin"
    //% weight=100   
    export function getWaterTemp(pin: DigitalPin): number {
        oneWirePin = pin
        return Math.round(readTemperature()*10.0)/10.0
    }

    // DS18B20に1-Wireリセット信号を送る関数
    function oneWireReset(): boolean {
        pins.digitalWritePin(oneWirePin, 0)
        control.waitMicros(500)  // ラインを低く維持
        pins.digitalWritePin(oneWirePin, 1)
        control.waitMicros(70)   // マスタがラインをリリース
        let presence = pins.digitalReadPin(oneWirePin)
        control.waitMicros(500)
        return presence == 0
    }

    // DS18B20に1ビットを書き込む関数
    function oneWireWriteBit(bit: number) {
        pins.digitalWritePin(oneWirePin, 0)
        control.waitMicros(bit == 1 ? 10 : 60)  // 1の場合は短く、0の場合は長く維持
        pins.digitalWritePin(oneWirePin, 1)
        control.waitMicros(bit == 1 ? 55 : 5)   // 1の場合は長くリリース、0の場合は短くリリース
    }

    // DS18B20に1バイトを書き込む関数
    function oneWireWriteByte(byte: number) {
        for (let i = 0; i < 8; i++) {
            oneWireWriteBit(byte & 0x01)
            byte = byte >> 1
        }
    }

    // DS18B20から1ビットを読み取る関数
    function oneWireReadBit(): number {
        pins.digitalWritePin(oneWirePin, 0)
        control.waitMicros(2)
        pins.digitalWritePin(oneWirePin, 1)
        control.waitMicros(12)
        let bit = pins.digitalReadPin(oneWirePin)
        control.waitMicros(50)
        return bit
    }

    // DS18B20から1バイトを読み取る関数
    function oneWireReadByte(): number {
        let byte = 0
        for (let i = 0; i < 8; i++) {
            byte = byte | (oneWireReadBit() << i)
        }
        return byte
    }

    // 温度を測定する関数
    function readTemperature(): number {
        // 1-Wireリセット
        if (!oneWireReset()) {
            basic.showString("Error")
            return -999  // センサーが見つからない場合のエラーハンドリング
        }

        // 温度変換コマンドを送信
        oneWireWriteByte(0xCC)  // ROMスキップコマンド
        oneWireWriteByte(CONVERT_T)

        // 温度計算の完了まで待つ
        basic.pause(750)  // 温度変換に最大750msかかる

        // 1-Wireリセット
        if (!oneWireReset()) {
            basic.showString("Error")
            return -999
        }

        // スクラッチパッドを読み取る
        oneWireWriteByte(0xCC)  // ROMスキップコマンド
        oneWireWriteByte(READ_SCRATCHPAD)

        let temp_LSB = oneWireReadByte()
        let temp_MSB = oneWireReadByte()

        // 温度データを計算（12ビット解像度）
        let temp = (temp_MSB << 8) | temp_LSB

        // 負の温度に対応
        if (temp > 0x7FF) {
            temp = temp - 4096
        }

        // 温度値を0.0625度の単位で返す
        return temp * 0.0625
    }
}



