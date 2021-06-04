class ArrayUtil {
  constructor (client = {}) { this.client = client }

  static shuffle (arr) {
    let length = arr.length
    while (length) {
      const index = Math.floor((length--) * Math.random())
      const temp = arr[length]
      arr[length] = arr[index]
      arr[index] = temp
    }
    return arr
  }

  static chunkArray (arr, chunkSize) {
    const array = []
    for (let i = 0, len = arr.length; i < len; i += chunkSize) {
      array.push(arr.slice(i, i + chunkSize))
    }
    return array
  }
}

module.exports = ArrayUtil
