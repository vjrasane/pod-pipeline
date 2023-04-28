

type ForEachValueParameters<V> = {
    values: V[]
}

export default async <V, T>({ values }: ForEachValueParameters<V>, callback: (value: V) => Promise<T>): Promise<T[]> => {
    return Promise.all(values.map(value => callback(value)))
}